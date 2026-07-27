import { randomInt } from 'crypto';
import { Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import { prisma } from '../db';
import {
  B2BInquiryStatus,
  calculateInquiryEstimate,
  canTransitionInquiry,
  createB2BFolio,
  validateTierCandidate,
} from '../lib/b2b-domain';
import { logAdminAction } from '../lib/adminLog';
import { sendMail } from '../lib/mail';
import { AuthRequest, requireAuth } from '../middleware/auth';

const router = Router();
const PUBLIC_FREQUENCIES = new Set(['one-time', 'weekly', 'biweekly', 'monthly']);
const INQUIRY_STATUSES = new Set<B2BInquiryStatus>([
  'NEW',
  'REVIEWING',
  'QUOTED',
  'NEGOTIATING',
  'WON',
  'LOST',
]);

const cleanString = (value: unknown, maxLength = 200): string =>
  typeof value === 'string' ? value.trim().slice(0, maxLength) : '';

const isEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const asPositiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const inquiryResponse = (inquiry: {
  id: string;
  folio: string;
  estimatedSubtotal: number;
  currency: string;
}) => ({
  inquiryId: inquiry.id,
  folio: inquiry.folio,
  estimatedSubtotal: inquiry.estimatedSubtotal,
  currency: inquiry.currency,
  message: 'Solicitud recibida. Te contactaremos en menos de 24 horas hábiles.',
});

// Public catalog: products are explicitly published and must have a valid tier.
router.get('/catalog', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        isActive: true,
        isB2BEnabled: true,
        b2bPriceTiers: { some: {} },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        origin: true,
        region: true,
        weight: true,
        sku: true,
        isB2BEnabled: true,
        b2bPriority: true,
        b2bPriceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: [{ b2bPriority: 'desc' }, { name: 'asc' }],
    });
    res.json({ data: products });
  } catch (error) {
    console.error('[b2b] GET /catalog', error);
    res.status(500).json({ error: 'Error al obtener el catálogo empresarial.' });
  }
});

router.get('/catalog/admin', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        description: true,
        origin: true,
        region: true,
        weight: true,
        sku: true,
        isB2BEnabled: true,
        b2bPriority: true,
        b2bPriceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: [{ isB2BEnabled: 'desc' }, { b2bPriority: 'desc' }, { name: 'asc' }],
    });
    res.json({ data: products });
  } catch (error) {
    console.error('[b2b] GET /catalog/admin', error);
    res.status(500).json({ error: 'Error al obtener el catálogo B2B administrativo.' });
  }
});

async function createInquiry(req: Request, res: Response) {
  try {
    const requestId = cleanString(req.body.requestId, 100);
    const businessName = cleanString(req.body.businessName ?? req.body.empresa, 160);
    const rfc = cleanString(req.body.rfc, 20).toUpperCase();
    const contactName = cleanString(req.body.contactName ?? req.body.contactoNombre, 120);
    const contactEmail = cleanString(
      req.body.contactEmail ?? req.body.contactoEmail,
      254,
    ).toLowerCase();
    const contactPhone = cleanString(req.body.contactPhone ?? req.body.contactoTelefono, 30);
    const businessType = cleanString(req.body.businessType ?? req.body.giroNegocio, 80);
    const frequency = cleanString(req.body.frequency, 30);
    const rawItems: Array<Record<string, unknown>> = Array.isArray(req.body.items)
      ? req.body.items
      : [];

    if (
      requestId.length < 8 ||
      !businessName ||
      !rfc ||
      !contactName ||
      !isEmail(contactEmail) ||
      !contactPhone ||
      !businessType ||
      !PUBLIC_FREQUENCIES.has(frequency) ||
      rawItems.length === 0 ||
      rawItems.length > 25
    ) {
      return res.status(400).json({
        error: 'Completa los datos de la empresa, una frecuencia válida y al menos un producto.',
      });
    }

    const existing = await prisma.b2BInquiry.findUnique({ where: { requestId } });
    if (existing) return res.status(200).json({ data: inquiryResponse(existing) });

    const requestedItems = rawItems.map((item: Record<string, unknown>) => ({
      productId: cleanString(item.productId, 80),
      quantity: asPositiveInteger(item.quantity) ?? 0,
      frequency: cleanString(item.frequency, 30) || frequency,
      clientUnitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : undefined,
    }));
    if (
      requestedItems.some(
        (item) => !item.productId || !item.quantity || !PUBLIC_FREQUENCIES.has(item.frequency),
      )
    ) {
      return res.status(400).json({ error: 'Revisa las cantidades y frecuencias seleccionadas.' });
    }

    const productIds = [...new Set(requestedItems.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true, isB2BEnabled: true },
      select: {
        id: true,
        name: true,
        sku: true,
        isB2BEnabled: true,
        b2bPriceTiers: { orderBy: { minQty: 'asc' } },
      },
    });

    let estimate;
    try {
      estimate = calculateInquiryEstimate(
        products.map((product) => ({
          id: product.id,
          name: product.name,
          sku: product.sku,
          isB2BEnabled: product.isB2BEnabled,
          tiers: product.b2bPriceTiers,
        })),
        requestedItems,
      );
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'No fue posible calcular la estimación.',
      });
    }

    const inquiry = await prisma.$transaction(async (tx) => {
      const created = await tx.b2BInquiry.create({
        data: {
          folio: createB2BFolio(randomInt(1, 1_000_000)),
          requestId,
          empresa: businessName,
          rfc,
          contactoNombre: contactName,
          contactoEmail: contactEmail,
          contactoTelefono: contactPhone,
          volumenEstimado: `${estimate.items.reduce((sum, item) => sum + item.quantity, 0)} unidades`,
          giroNegocio: businessType,
          businessType,
          frequency,
          estimatedSubtotal: estimate.subtotal,
          currency: 'MXN',
          status: 'NEW',
          items: {
            create: estimate.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              sku: item.sku,
              quantity: item.quantity,
              frequency: item.frequency,
              tierId: item.tierId,
              unitPrice: item.unitPrice,
              subtotal: item.subtotal,
            })),
          },
        },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: created.id,
          type: 'CREATED',
          message: 'Solicitud creada desde el cotizador empresarial.',
          metadata: { source: 'public-builder', requestId },
        },
      });
      return created;
    });

    return res.status(201).json({ data: inquiryResponse(inquiry) });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      cleanString(req.body.requestId, 100)
    ) {
      const existing = await prisma.b2BInquiry.findUnique({
        where: { requestId: cleanString(req.body.requestId, 100) },
      });
      if (existing) return res.status(200).json({ data: inquiryResponse(existing) });
    }
    console.error('[b2b] POST /inquiries', error);
    return res.status(500).json({ error: 'No fue posible enviar la solicitud.' });
  }
}

router.post('/inquiries', createInquiry);
router.post('/inquiry', createInquiry); // temporary compatibility alias

// Admin pipeline summary.
router.get('/metrics', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const [grouped, openValue, wonCompanies] = await Promise.all([
      prisma.b2BInquiry.groupBy({ by: ['status'], _count: { _all: true } }),
      prisma.b2BInquiry.aggregate({
        where: { status: { in: ['NEW', 'REVIEWING', 'QUOTED', 'NEGOTIATING'] } },
        _sum: { estimatedSubtotal: true },
      }),
      prisma.b2BCompany.count(),
    ]);
    const byStatus = Object.fromEntries(grouped.map((entry) => [entry.status, entry._count._all]));
    res.json({
      data: {
        byStatus,
        openValue: openValue._sum.estimatedSubtotal ?? 0,
        companies: wonCompanies,
      },
    });
  } catch (error) {
    console.error('[b2b] GET /metrics', error);
    res.status(500).json({ error: 'Error al obtener métricas B2B.' });
  }
});

router.get('/inquiries', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
    const status = cleanString(req.query.status, 20);
    const search = cleanString(req.query.search, 120);
    const where: Prisma.B2BInquiryWhereInput = {
      ...(INQUIRY_STATUSES.has(status as B2BInquiryStatus) ? { status } : {}),
      ...(search
        ? {
            OR: [
              { folio: { contains: search, mode: 'insensitive' } },
              { empresa: { contains: search, mode: 'insensitive' } },
              { contactoEmail: { contains: search, mode: 'insensitive' } },
              { rfc: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [data, total] = await Promise.all([
      prisma.b2BInquiry.findMany({
        where,
        include: {
          assignedAdmin: { select: { id: true, name: true } },
          items: true,
          quotes: { orderBy: { version: 'desc' }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.b2BInquiry.count({ where }),
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error('[b2b] GET /inquiries', error);
    res.status(500).json({ error: 'Error al obtener solicitudes B2B.' });
  }
});

router.get('/inquiries/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inquiry = await prisma.b2BInquiry.findUnique({
      where: { id: req.params.id },
      include: {
        assignedAdmin: { select: { id: true, name: true, email: true } },
        items: { orderBy: { createdAt: 'asc' } },
        activities: {
          include: { admin: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'desc' },
        },
        quotes: { include: { items: true }, orderBy: { version: 'desc' } },
        company: true,
        order: { include: { items: true } },
      },
    });
    if (!inquiry) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    return res.json({ data: inquiry });
  } catch (error) {
    console.error('[b2b] GET /inquiries/:id', error);
    return res.status(500).json({ error: 'Error al obtener la solicitud.' });
  }
});

router.patch('/inquiries/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const status = cleanString(req.body.status, 20) as B2BInquiryStatus;
    const lostReason = cleanString(req.body.lostReason, 500);
    if (!INQUIRY_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Estado B2B inválido.' });
    }
    const current = await prisma.b2BInquiry.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    if (
      !canTransitionInquiry(current.status as B2BInquiryStatus, status) ||
      (status === 'LOST' && !lostReason)
    ) {
      return res.status(409).json({
        error:
          status === 'LOST'
            ? 'Indica el motivo de pérdida.'
            : `No se puede pasar de ${current.status} a ${status}.`,
      });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.b2BInquiry.update({
        where: { id: current.id },
        data: {
          status,
          lostReason: status === 'LOST' ? lostReason : null,
          assignedAdminId: current.assignedAdminId ?? req.admin?.id,
          nextAction: cleanString(req.body.nextAction, 240) || null,
          nextFollowUpAt: req.body.nextFollowUpAt
            ? new Date(req.body.nextFollowUpAt)
            : current.nextFollowUpAt,
        },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: current.id,
          adminId: req.admin?.id,
          type: 'STATUS_CHANGED',
          message: `Estado actualizado de ${current.status} a ${status}.`,
          metadata: status === 'LOST' ? { lostReason } : undefined,
        },
      });
      return inquiry;
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'STATUS_CHANGE',
      entity: 'B2BInquiry',
      entityId: current.id,
      metadata: { from: current.status, to: status },
    });
    return res.json({ data: updated });
  } catch (error) {
    console.error('[b2b] PATCH /inquiries/:id/status', error);
    return res.status(500).json({ error: 'No fue posible actualizar el estado.' });
  }
});

router.post('/inquiries/:id/activities', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const message = cleanString(req.body.message, 1000);
    if (!message) return res.status(400).json({ error: 'Escribe una nota.' });
    const activity = await prisma.b2BActivity.create({
      data: {
        inquiryId: req.params.id,
        adminId: req.admin?.id,
        type: 'NOTE',
        message,
      },
    });
    return res.status(201).json({ data: activity });
  } catch (error) {
    console.error('[b2b] POST /inquiries/:id/activities', error);
    return res.status(500).json({ error: 'No fue posible guardar la nota.' });
  }
});

router.post('/inquiries/:id/quotes', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rawItems: Array<Record<string, unknown>> = Array.isArray(req.body.items)
      ? req.body.items
      : [];
    const items = rawItems.map((item: Record<string, unknown>) => {
      const quantity = asPositiveInteger(item.quantity) ?? 0;
      const unitPrice = Number(item.unitPrice);
      return {
        productId: cleanString(item.productId, 80),
        productName: cleanString(item.productName, 160),
        sku: cleanString(item.sku, 80) || null,
        quantity,
        unitPrice,
        subtotal: Math.round(quantity * unitPrice * 100) / 100,
      };
    });
    const validUntil = new Date(req.body.validUntil);
    if (
      !items.length ||
      items.some(
        (item) =>
          !item.productId ||
          !item.productName ||
          !item.quantity ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice <= 0,
      ) ||
      Number.isNaN(validUntil.getTime()) ||
      validUntil <= new Date()
    ) {
      return res.status(400).json({ error: 'Revisa partidas, precios y vigencia.' });
    }
    const quote = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.b2BInquiry.findUnique({ where: { id: req.params.id } });
      if (!inquiry) throw new Error('INQUIRY_NOT_FOUND');
      const latest = await tx.b2BQuote.findFirst({
        where: { inquiryId: inquiry.id },
        orderBy: { version: 'desc' },
      });
      const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
      const taxAmount = Math.round(Number(req.body.taxAmount || 0) * 100) / 100;
      const created = await tx.b2BQuote.create({
        data: {
          inquiryId: inquiry.id,
          version: (latest?.version ?? 0) + 1,
          subtotal,
          taxAmount,
          total: Math.round((subtotal + taxAmount) * 100) / 100,
          currency: 'MXN',
          validUntil,
          paymentTerms: cleanString(req.body.paymentTerms, 160) || null,
          notes: cleanString(req.body.notes, 2000) || null,
          createdById: req.admin?.id,
          items: { create: items },
        },
        include: { items: true },
      });
      await tx.b2BQuote.updateMany({
        where: {
          inquiryId: inquiry.id,
          id: { not: created.id },
          status: { in: ['DRAFT', 'SENT'] },
        },
        data: { status: 'SUPERSEDED' },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: inquiry.id,
          adminId: req.admin?.id,
          type: 'QUOTE_CREATED',
          message: `Cotización v${created.version} creada por $${created.total.toFixed(2)} MXN.`,
          metadata: { quoteId: created.id, version: created.version },
        },
      });
      return created;
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'B2BQuote',
      entityId: quote.id,
      metadata: { inquiryId: req.params.id, version: quote.version, total: quote.total },
    });
    return res.status(201).json({ data: quote });
  } catch (error) {
    if (error instanceof Error && error.message === 'INQUIRY_NOT_FOUND') {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
    console.error('[b2b] POST /inquiries/:id/quotes', error);
    return res.status(500).json({ error: 'No fue posible crear la cotización.' });
  }
});

router.post('/quotes/:id/send', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const quote = await prisma.b2BQuote.findUnique({
      where: { id: req.params.id },
      include: { items: true, inquiry: true },
    });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada.' });
    if (quote.status !== 'DRAFT') {
      return res.status(409).json({ error: 'Sólo se puede enviar una cotización en borrador.' });
    }
    const rows = quote.items
      .map(
        (item) =>
          `<tr><td style="padding:8px">${item.productName}</td><td style="padding:8px;text-align:center">${item.quantity}</td><td style="padding:8px;text-align:right">$${item.subtotal.toFixed(2)}</td></tr>`,
      )
      .join('');
    const sent = await sendMail({
      to: quote.inquiry.contactoEmail,
      subject: `${quote.inquiry.folio} · Cotización empresarial v${quote.version}`,
      html: `<div style="font-family:Arial,sans-serif;color:#27170f;max-width:680px;margin:auto">
        <p style="letter-spacing:.18em;color:#7d4d1f">12% CAFÉ · EMPRESAS</p>
        <h1>Cotización para ${quote.inquiry.empresa}</h1>
        <p>Hola ${quote.inquiry.contactoNombre}, preparamos esta selección para tu operación.</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <p style="font-size:20px;text-align:right"><strong>Total: $${quote.total.toFixed(2)} MXN</strong></p>
        <p>Vigencia: ${quote.validUntil.toLocaleDateString('es-MX')}.</p>
        ${quote.paymentTerms ? `<p>Condiciones: ${quote.paymentTerms}</p>` : ''}
        ${quote.notes ? `<p>${quote.notes}</p>` : ''}
        <p>Responde este correo para confirmar o solicitar ajustes.</p>
      </div>`,
    });
    if (!sent) {
      return res.status(502).json({
        error: 'El correo no pudo enviarse; la cotización continúa en borrador.',
      });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.b2BQuote.update({
        where: { id: quote.id },
        data: { status: 'SENT', sentAt: new Date() },
      });
      await tx.b2BInquiry.update({
        where: { id: quote.inquiryId },
        data: { status: 'QUOTED', assignedAdminId: req.admin?.id },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: quote.inquiryId,
          adminId: req.admin?.id,
          type: 'QUOTE_SENT',
          message: `Cotización v${quote.version} enviada a ${quote.inquiry.contactoEmail}.`,
          metadata: { quoteId: quote.id },
        },
      });
      return saved;
    });
    return res.json({ data: updated });
  } catch (error) {
    console.error('[b2b] POST /quotes/:id/send', error);
    return res.status(500).json({ error: 'No fue posible enviar la cotización.' });
  }
});

router.post('/quotes/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const quote = await prisma.b2BQuote.findUnique({ where: { id: req.params.id } });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada.' });
    if (!['SENT', 'DRAFT'].includes(quote.status)) {
      return res.status(409).json({ error: 'La cotización ya no puede aceptarse.' });
    }
    const accepted = await prisma.$transaction(async (tx) => {
      await tx.b2BQuote.updateMany({
        where: { inquiryId: quote.inquiryId, id: { not: quote.id }, status: { not: 'EXPIRED' } },
        data: { status: 'SUPERSEDED' },
      });
      const saved = await tx.b2BQuote.update({
        where: { id: quote.id },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      await tx.b2BInquiry.update({
        where: { id: quote.inquiryId },
        data: { status: 'WON', assignedAdminId: req.admin?.id },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: quote.inquiryId,
          adminId: req.admin?.id,
          type: 'QUOTE_ACCEPTED',
          message: `Aceptación de cotización v${quote.version} registrada manualmente.`,
          metadata: { quoteId: quote.id },
        },
      });
      return saved;
    });
    return res.json({ data: accepted });
  } catch (error) {
    console.error('[b2b] POST /quotes/:id/accept', error);
    return res.status(500).json({ error: 'No fue posible registrar la aceptación.' });
  }
});

router.post('/inquiries/:id/convert', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.b2BInquiry.findUnique({
        where: { id: req.params.id },
        include: {
          quotes: {
            where: { status: 'ACCEPTED' },
            include: { items: true },
            orderBy: { version: 'desc' },
            take: 1,
          },
        },
      });
      if (!inquiry) throw new Error('INQUIRY_NOT_FOUND');
      if (inquiry.orderId) throw new Error('ALREADY_CONVERTED');
      const quote = inquiry.quotes[0];
      if (!quote) throw new Error('ACCEPTED_QUOTE_REQUIRED');

      const company = await tx.b2BCompany.upsert({
        where: { rfc: inquiry.rfc },
        create: {
          businessName: inquiry.empresa,
          rfc: inquiry.rfc,
          contactName: inquiry.contactoNombre,
          contactEmail: inquiry.contactoEmail,
          contactPhone: inquiry.contactoTelefono,
          paymentTerms: quote.paymentTerms,
        },
        update: {
          businessName: inquiry.empresa,
          contactName: inquiry.contactoNombre,
          contactEmail: inquiry.contactoEmail,
          contactPhone: inquiry.contactoTelefono,
          paymentTerms: quote.paymentTerms,
        },
      });
      const order = await tx.order.create({
        data: {
          customerName: inquiry.contactoNombre,
          email: inquiry.contactoEmail,
          phone: inquiry.contactoTelefono,
          address: cleanString(req.body.address, 240) || 'Por confirmar',
          city: cleanString(req.body.city, 100) || 'Por confirmar',
          state: cleanString(req.body.state, 100) || 'Por confirmar',
          zipCode: cleanString(req.body.zipCode, 10) || '00000',
          total: quote.total,
          status: 'PENDING',
          orderType: 'B2B',
          businessName: inquiry.empresa,
          rfc: inquiry.rfc,
          paymentTerms: quote.paymentTerms,
          b2bCompanyId: company.id,
          sourceQuoteId: quote.id,
          items: {
            create: quote.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.unitPrice,
            })),
          },
        },
      });
      await tx.b2BInquiry.update({
        where: { id: inquiry.id },
        data: { companyId: company.id, orderId: order.id, status: 'WON' },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: inquiry.id,
          adminId: req.admin?.id,
          type: 'CONVERTED',
          message: `Empresa y pedido ${order.id} creados desde la cotización aceptada.`,
          metadata: { companyId: company.id, orderId: order.id, quoteId: quote.id },
        },
      });
      return { company, order };
    });
    return res.status(201).json({ data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    if (message === 'INQUIRY_NOT_FOUND') {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }
    if (message === 'ALREADY_CONVERTED') {
      return res.status(409).json({ error: 'La solicitud ya fue convertida.' });
    }
    if (message === 'ACCEPTED_QUOTE_REQUIRED') {
      return res.status(409).json({ error: 'Primero registra una cotización aceptada.' });
    }
    console.error('[b2b] POST /inquiries/:id/convert', error);
    return res.status(500).json({ error: 'No fue posible convertir la solicitud.' });
  }
});

router.get('/companies', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const search = cleanString(req.query.search, 120);
    const data = await prisma.b2BCompany.findMany({
      where: search
        ? {
            OR: [
              { businessName: { contains: search, mode: 'insensitive' } },
              { rfc: { contains: search, mode: 'insensitive' } },
              { contactEmail: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: {
        _count: { select: { inquiries: true, orders: true } },
        orders: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({ data });
  } catch (error) {
    console.error('[b2b] GET /companies', error);
    res.status(500).json({ error: 'Error al obtener empresas.' });
  }
});

router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 20));
    const where = { orderType: 'B2B' };
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: {
          b2bCompany: true,
          sourceQuote: { select: { id: true, version: true } },
          items: { include: { product: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (error) {
    console.error('[b2b] GET /orders', error);
    res.status(500).json({ error: 'Error al obtener pedidos B2B.' });
  }
});

router.get('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tiers = await prisma.b2BPriceTier.findMany({
      where: { productId: req.params.productId },
      orderBy: { minQty: 'asc' },
    });
    res.json({ data: tiers });
  } catch (error) {
    console.error('[b2b] GET /tiers/:productId', error);
    res.status(500).json({ error: 'Error al obtener precios por volumen.' });
  }
});

router.post('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const existing = await prisma.b2BPriceTier.findMany({
      where: { productId: req.params.productId },
    });
    const candidate = {
      minQty: Number(req.body.minQty),
      maxQty: req.body.maxQty === null || req.body.maxQty === '' ? null : Number(req.body.maxQty),
      pricePerUnit: Number(req.body.pricePerUnit),
    };
    const validationError = validateTierCandidate(existing, candidate);
    if (validationError) return res.status(400).json({ error: validationError });
    const tier = await prisma.b2BPriceTier.create({
      data: { productId: req.params.productId, ...candidate },
    });
    await prisma.product.update({
      where: { id: req.params.productId },
      data: { isB2BEnabled: true },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: req.params.productId, ...candidate },
    });
    return res.status(201).json({ data: tier });
  } catch (error) {
    console.error('[b2b] POST /tiers/:productId', error);
    return res.status(500).json({ error: 'Error al crear precio por volumen.' });
  }
});

router.put('/tiers/item/:tierId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const current = await prisma.b2BPriceTier.findUnique({ where: { id: req.params.tierId } });
    if (!current) return res.status(404).json({ error: 'Tier no encontrado.' });
    const existing = await prisma.b2BPriceTier.findMany({
      where: { productId: current.productId },
    });
    const candidate = {
      minQty: Number(req.body.minQty),
      maxQty: req.body.maxQty === null || req.body.maxQty === '' ? null : Number(req.body.maxQty),
      pricePerUnit: Number(req.body.pricePerUnit),
    };
    const validationError = validateTierCandidate(existing, candidate, current.id);
    if (validationError) return res.status(400).json({ error: validationError });
    const tier = await prisma.b2BPriceTier.update({
      where: { id: current.id },
      data: candidate,
    });
    return res.json({ data: tier });
  } catch (error) {
    console.error('[b2b] PUT /tiers/item/:tierId', error);
    return res.status(500).json({ error: 'Error al actualizar precio por volumen.' });
  }
});

router.delete('/tiers/item/:tierId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tier = await prisma.b2BPriceTier.findUnique({ where: { id: req.params.tierId } });
    if (!tier) return res.status(404).json({ error: 'Tier no encontrado.' });
    await prisma.b2BPriceTier.delete({ where: { id: tier.id } });
    const remaining = await prisma.b2BPriceTier.count({ where: { productId: tier.productId } });
    if (remaining === 0) {
      await prisma.product.update({
        where: { id: tier.productId },
        data: { isB2BEnabled: false },
      });
    }
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: tier.productId },
    });
    return res.json({ data: { deleted: true } });
  } catch (error) {
    console.error('[b2b] DELETE /tiers/item/:tierId', error);
    return res.status(500).json({ error: 'Error al eliminar precio por volumen.' });
  }
});

export default router;
