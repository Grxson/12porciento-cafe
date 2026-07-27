import { Prisma } from '@prisma/client';
import { Request, Response, Router } from 'express';
import { prisma } from '../db';
import {
  B2BInquiryStatus,
  MAX_B2B_LINE_QUANTITY,
  MAX_B2B_TOTAL_QUANTITY,
  calculateInquiryEstimate,
  canTransitionInquiry,
  createB2BFolio,
  hasValidTierSet,
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

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!,
  );

const isEmail = (value: string): boolean =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

const isValidRfc = (value: string): boolean => /^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/.test(value);

const asPositiveInteger = (value: unknown): number | null => {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const nextB2BFolio = async (tx: Prisma.TransactionClient): Promise<string> => {
  const rows = await tx.$queryRaw<Array<{ sequence: bigint }>>`
    SELECT nextval('"B2BFolioSequence"') AS sequence
  `;
  const sequence = Number(rows[0]?.sequence);
  return createB2BFolio(sequence);
};

class TierValidationError extends Error {}

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
    res.json({
      data: products.filter((product) => hasValidTierSet(product.b2bPriceTiers)),
    });
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
    if (rfc && !isValidRfc(rfc)) {
      return res.status(400).json({ error: 'El RFC no tiene un formato válido.' });
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

    let inquiry: Awaited<ReturnType<typeof prisma.b2BInquiry.create>> | null = null;
    for (let attempt = 0; attempt < 3 && !inquiry; attempt += 1) {
      try {
        inquiry = await prisma.$transaction(async (tx) => {
          const created = await tx.b2BInquiry.create({
            data: {
              folio: await nextB2BFolio(tx),
              requestId,
              empresa: businessName,
              rfc: rfc || null,
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
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          const duplicate = await prisma.b2BInquiry.findUnique({ where: { requestId } });
          if (duplicate) return res.status(200).json({ data: inquiryResponse(duplicate) });
          if (attempt < 2) continue;
        }
        throw error;
      }
    }
    if (!inquiry) throw new Error('FOLIO_GENERATION_FAILED');

    const receiptSent = await sendMail({
      to: contactEmail,
      subject: `${inquiry.folio} · Recibimos tu solicitud empresarial`,
      html: `<div style="font-family:Arial,sans-serif;color:#27170f;max-width:680px;margin:auto">
        <p style="letter-spacing:.18em;color:#7d4d1f">12% CAFÉ · EMPRESAS</p>
        <h1>Recibimos tu selección, ${escapeHtml(contactName)}.</h1>
        <p>Tu folio es <strong>${escapeHtml(inquiry.folio)}</strong>.</p>
        <p>El estimado inicial es de <strong>$${inquiry.estimatedSubtotal.toFixed(2)} MXN</strong> antes de IVA.</p>
        <p>Un especialista revisará disponibilidad, logística y condiciones comerciales. Te contactaremos en menos de 24 horas hábiles.</p>
      </div>`,
    });
    if (!receiptSent) {
      await prisma.b2BActivity
        .create({
          data: {
            inquiryId: inquiry.id,
            type: 'RECEIPT_EMAIL_FAILED',
            message: 'No fue posible enviar el acuse de recepción; requiere reintento.',
            metadata: { contactEmail },
          },
        })
        .catch((activityError) =>
          console.error('[b2b] No fue posible registrar el fallo de correo', activityError),
        );
    }

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
    const assignedAdminId = cleanString(req.query.assignedAdminId, 80);
    const from = req.query.from ? new Date(String(req.query.from)) : null;
    const to = req.query.to ? new Date(String(req.query.to)) : null;
    const sla = cleanString(req.query.sla, 20);
    const filters: Prisma.B2BInquiryWhereInput[] = [];
    if (search) {
      filters.push({
        OR: [
          { folio: { contains: search, mode: 'insensitive' } },
          { empresa: { contains: search, mode: 'insensitive' } },
          { contactoEmail: { contains: search, mode: 'insensitive' } },
          { rfc: { contains: search, mode: 'insensitive' } },
        ],
      });
    }
    if (sla === 'overdue') {
      filters.push({
        OR: [
          { nextFollowUpAt: { lt: new Date() } },
          { status: 'NEW', createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
        ],
      });
    }
    const where: Prisma.B2BInquiryWhereInput = {
      ...(INQUIRY_STATUSES.has(status as B2BInquiryStatus) ? { status } : {}),
      ...(assignedAdminId === 'unassigned'
        ? { assignedAdminId: null }
        : assignedAdminId
          ? { assignedAdminId }
          : {}),
      ...((from && !Number.isNaN(from.getTime())) || (to && !Number.isNaN(to.getTime()))
        ? {
            createdAt: {
              ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}),
              ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}),
            },
          }
        : {}),
      ...(filters.length ? { AND: filters } : {}),
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
    const requestedStatus = cleanString(req.body.status, 20) as B2BInquiryStatus | '';
    const lostReason = cleanString(req.body.lostReason, 500);
    if (requestedStatus === 'WON') {
      return res.status(409).json({
        error: 'El estado ganado se asigna únicamente al convertir la cotización en pedido.',
      });
    }
    if (requestedStatus && !INQUIRY_STATUSES.has(requestedStatus)) {
      return res.status(400).json({ error: 'Estado B2B inválido.' });
    }
    const current = await prisma.b2BInquiry.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ error: 'Solicitud no encontrada.' });
    const status = (requestedStatus || current.status) as B2BInquiryStatus;
    const sameStatus = status === current.status;
    const assignedAdminProvided = Object.prototype.hasOwnProperty.call(req.body, 'assignedAdminId');
    const assignedAdminId = assignedAdminProvided
      ? cleanString(req.body.assignedAdminId, 80) || null
      : current.assignedAdminId;
    const nextActionProvided = Object.prototype.hasOwnProperty.call(req.body, 'nextAction');
    const nextFollowUpProvided = Object.prototype.hasOwnProperty.call(req.body, 'nextFollowUpAt');
    const nextFollowUpAt =
      nextFollowUpProvided && req.body.nextFollowUpAt
        ? new Date(req.body.nextFollowUpAt)
        : nextFollowUpProvided
          ? null
          : current.nextFollowUpAt;
    if (nextFollowUpAt && Number.isNaN(nextFollowUpAt.getTime())) {
      return res.status(400).json({ error: 'La fecha de seguimiento no es válida.' });
    }
    if (
      (!sameStatus && !canTransitionInquiry(current.status as B2BInquiryStatus, status)) ||
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
      if (assignedAdminId) {
        const assignee = await tx.adminUser.findUnique({
          where: { id: assignedAdminId },
          select: { id: true },
        });
        if (!assignee) throw new Error('ASSIGNEE_NOT_FOUND');
      }
      const inquiry = await tx.b2BInquiry.update({
        where: { id: current.id },
        data: {
          status,
          lostReason: status === 'LOST' ? lostReason : null,
          assignedAdminId,
          nextAction: nextActionProvided
            ? cleanString(req.body.nextAction, 240) || null
            : current.nextAction,
          nextFollowUpAt,
        },
      });
      await tx.b2BActivity.create({
        data: {
          inquiryId: current.id,
          adminId: req.admin?.id,
          type: sameStatus ? 'FOLLOW_UP_UPDATED' : 'STATUS_CHANGED',
          message: sameStatus
            ? 'Responsable o próxima acción actualizados.'
            : `Estado actualizado de ${current.status} a ${status}.`,
          metadata:
            status === 'LOST'
              ? { lostReason }
              : { assignedAdminId, nextAction: cleanString(req.body.nextAction, 240) || null },
        },
      });
      return inquiry;
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: sameStatus ? 'UPDATE' : 'STATUS_CHANGE',
      entity: 'B2BInquiry',
      entityId: current.id,
      metadata: { from: current.status, to: status, assignedAdminId, nextFollowUpAt },
    });
    return res.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'ASSIGNEE_NOT_FOUND') {
      return res.status(400).json({ error: 'El responsable seleccionado no existe.' });
    }
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
    const taxAmount = Math.round(Number(req.body.taxAmount ?? 0) * 100) / 100;
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    if (
      !items.length ||
      items.length > 25 ||
      totalQuantity > MAX_B2B_TOTAL_QUANTITY ||
      items.some(
        (item) =>
          !item.productId ||
          !item.productName ||
          !item.quantity ||
          item.quantity > MAX_B2B_LINE_QUANTITY ||
          !Number.isFinite(item.unitPrice) ||
          item.unitPrice <= 0,
      ) ||
      !Number.isFinite(taxAmount) ||
      taxAmount < 0 ||
      Number.isNaN(validUntil.getTime()) ||
      validUntil <= new Date()
    ) {
      return res.status(400).json({ error: 'Revisa partidas, precios y vigencia.' });
    }
    const quote = await prisma.$transaction(async (tx) => {
      const inquiry = await tx.b2BInquiry.findUnique({ where: { id: req.params.id } });
      if (!inquiry) throw new Error('INQUIRY_NOT_FOUND');
      if (['WON', 'LOST'].includes(inquiry.status)) throw new Error('INQUIRY_CLOSED');
      const latest = await tx.b2BQuote.findFirst({
        where: { inquiryId: inquiry.id },
        orderBy: { version: 'desc' },
      });
      const subtotal = Math.round(items.reduce((sum, item) => sum + item.subtotal, 0) * 100) / 100;
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
          status: 'DRAFT',
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
    if (error instanceof Error && error.message === 'INQUIRY_CLOSED') {
      return res.status(409).json({ error: 'La solicitud ya está cerrada.' });
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
    if (['WON', 'LOST'].includes(quote.inquiry.status)) {
      return res.status(409).json({ error: 'La solicitud ya está cerrada.' });
    }
    if (quote.validUntil <= new Date()) {
      await prisma.b2BQuote.update({
        where: { id: quote.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({ error: 'La cotización venció; crea una nueva versión.' });
    }
    const rows = quote.items
      .map(
        (item) =>
          `<tr><td style="padding:8px">${escapeHtml(item.productName)}</td><td style="padding:8px;text-align:center">${item.quantity}</td><td style="padding:8px;text-align:right">$${item.subtotal.toFixed(2)}</td></tr>`,
      )
      .join('');
    const sent = await sendMail({
      to: quote.inquiry.contactoEmail,
      subject: `${quote.inquiry.folio} · Cotización empresarial v${quote.version}`,
      html: `<div style="font-family:Arial,sans-serif;color:#27170f;max-width:680px;margin:auto">
        <p style="letter-spacing:.18em;color:#7d4d1f">12% CAFÉ · EMPRESAS</p>
        <h1>Cotización para ${escapeHtml(quote.inquiry.empresa)}</h1>
        <p>Hola ${escapeHtml(quote.inquiry.contactoNombre)}, preparamos esta selección para tu operación.</p>
        <table style="width:100%;border-collapse:collapse">${rows}</table>
        <p style="font-size:20px;text-align:right"><strong>Total: $${quote.total.toFixed(2)} MXN</strong></p>
        <p>Vigencia: ${quote.validUntil.toLocaleDateString('es-MX')}.</p>
        ${quote.paymentTerms ? `<p>Condiciones: ${escapeHtml(quote.paymentTerms)}</p>` : ''}
        ${quote.notes ? `<p>${escapeHtml(quote.notes).replace(/\n/g, '<br>')}</p>` : ''}
        <p>Responde este correo para confirmar o solicitar ajustes.</p>
      </div>`,
    });
    if (!sent) {
      return res.status(502).json({
        error: 'El correo no pudo enviarse; la cotización continúa en borrador.',
      });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const target = await tx.b2BQuote.updateMany({
        where: { id: quote.id, status: 'DRAFT' },
        data: { status: 'SENT', sentAt: new Date() },
      });
      if (target.count !== 1) throw new Error('QUOTE_STATE_CHANGED');
      await tx.b2BQuote.updateMany({
        where: {
          inquiryId: quote.inquiryId,
          id: { not: quote.id },
          status: 'SENT',
        },
        data: { status: 'SUPERSEDED' },
      });
      const inquiry = await tx.b2BInquiry.updateMany({
        where: {
          id: quote.inquiryId,
          status: { in: ['NEW', 'REVIEWING', 'QUOTED', 'NEGOTIATING'] },
        },
        data: { status: 'QUOTED', assignedAdminId: req.admin?.id },
      });
      if (inquiry.count !== 1) throw new Error('INQUIRY_CLOSED');
      await tx.b2BActivity.create({
        data: {
          inquiryId: quote.inquiryId,
          adminId: req.admin?.id,
          type: 'QUOTE_SENT',
          message: `Cotización v${quote.version} enviada a ${quote.inquiry.contactoEmail}.`,
          metadata: { quoteId: quote.id },
        },
      });
      return tx.b2BQuote.findUniqueOrThrow({
        where: { id: quote.id },
        include: { items: true },
      });
    });
    return res.json({ data: updated });
  } catch (error) {
    if (
      error instanceof Error &&
      ['QUOTE_STATE_CHANGED', 'INQUIRY_CLOSED'].includes(error.message)
    ) {
      return res.status(409).json({ error: 'La cotización o la solicitud cambiaron de estado.' });
    }
    console.error('[b2b] POST /quotes/:id/send', error);
    return res.status(500).json({ error: 'No fue posible enviar la cotización.' });
  }
});

router.post('/quotes/:id/accept', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const quote = await prisma.b2BQuote.findUnique({
      where: { id: req.params.id },
      include: { inquiry: { select: { status: true } } },
    });
    if (!quote) return res.status(404).json({ error: 'Cotización no encontrada.' });
    if (quote.status !== 'SENT') {
      return res.status(409).json({ error: 'Sólo una cotización enviada puede aceptarse.' });
    }
    if (['WON', 'LOST'].includes(quote.inquiry.status)) {
      return res.status(409).json({ error: 'La solicitud ya está cerrada.' });
    }
    if (quote.validUntil <= new Date()) {
      await prisma.b2BQuote.update({
        where: { id: quote.id },
        data: { status: 'EXPIRED' },
      });
      return res.status(409).json({ error: 'La cotización está vencida.' });
    }
    const accepted = await prisma.$transaction(async (tx) => {
      const target = await tx.b2BQuote.updateMany({
        where: { id: quote.id, status: 'SENT' },
        data: { status: 'ACCEPTED', acceptedAt: new Date() },
      });
      if (target.count !== 1) throw new Error('QUOTE_STATE_CHANGED');
      await tx.b2BQuote.updateMany({
        where: { inquiryId: quote.inquiryId, id: { not: quote.id }, status: { not: 'EXPIRED' } },
        data: { status: 'SUPERSEDED' },
      });
      const inquiry = await tx.b2BInquiry.updateMany({
        where: {
          id: quote.inquiryId,
          status: { in: ['REVIEWING', 'QUOTED', 'NEGOTIATING'] },
        },
        data: { status: 'NEGOTIATING', assignedAdminId: req.admin?.id },
      });
      if (inquiry.count !== 1) throw new Error('INQUIRY_CLOSED');
      await tx.b2BActivity.create({
        data: {
          inquiryId: quote.inquiryId,
          adminId: req.admin?.id,
          type: 'QUOTE_ACCEPTED',
          message: `Aceptación de cotización v${quote.version} registrada manualmente.`,
          metadata: { quoteId: quote.id },
        },
      });
      return tx.b2BQuote.findUniqueOrThrow({ where: { id: quote.id } });
    });
    return res.json({ data: accepted });
  } catch (error) {
    if (
      error instanceof Error &&
      ['QUOTE_STATE_CHANGED', 'INQUIRY_CLOSED'].includes(error.message)
    ) {
      return res.status(409).json({ error: 'La cotización o la solicitud cambiaron de estado.' });
    }
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
      if (inquiry.status === 'LOST') throw new Error('INQUIRY_CLOSED');
      const quote = inquiry.quotes[0];
      if (!quote) throw new Error('ACCEPTED_QUOTE_REQUIRED');
      const rfc = cleanString(req.body.rfc ?? inquiry.rfc, 20).toUpperCase();
      if (!isValidRfc(rfc)) throw new Error('RFC_REQUIRED');

      const company = await tx.b2BCompany.upsert({
        where: { rfc },
        create: {
          businessName: inquiry.empresa,
          rfc,
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
          rfc,
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
        data: { rfc, companyId: company.id, orderId: order.id, status: 'WON' },
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
    if (message === 'RFC_REQUIRED') {
      return res.status(400).json({ error: 'Captura un RFC válido antes de convertir.' });
    }
    if (message === 'INQUIRY_CLOSED') {
      return res.status(409).json({ error: 'La solicitud está cerrada.' });
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
    const candidate = {
      minQty: Number(req.body.minQty),
      maxQty: req.body.maxQty === null || req.body.maxQty === '' ? null : Number(req.body.maxQty),
      pricePerUnit: Number(req.body.pricePerUnit),
    };
    const tier = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.b2BPriceTier.findMany({
          where: { productId: req.params.productId },
        });
        const validationError = validateTierCandidate(existing, candidate);
        if (validationError) throw new TierValidationError(validationError);
        const created = await tx.b2BPriceTier.create({
          data: { productId: req.params.productId, ...candidate },
        });
        await tx.product.update({
          where: { id: req.params.productId },
          data: { isB2BEnabled: true },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: req.params.productId, ...candidate },
    });
    return res.status(201).json({ data: tier });
  } catch (error) {
    if (error instanceof TierValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return res.status(409).json({ error: 'Los precios cambiaron; vuelve a intentarlo.' });
    }
    console.error('[b2b] POST /tiers/:productId', error);
    return res.status(500).json({ error: 'Error al crear precio por volumen.' });
  }
});

router.put('/tiers/item/:tierId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const candidate = {
      minQty: Number(req.body.minQty),
      maxQty: req.body.maxQty === null || req.body.maxQty === '' ? null : Number(req.body.maxQty),
      pricePerUnit: Number(req.body.pricePerUnit),
    };
    const tier = await prisma.$transaction(
      async (tx) => {
        const current = await tx.b2BPriceTier.findUnique({ where: { id: req.params.tierId } });
        if (!current) throw new Error('TIER_NOT_FOUND');
        const existing = await tx.b2BPriceTier.findMany({
          where: { productId: current.productId },
        });
        const validationError = validateTierCandidate(existing, candidate, current.id);
        if (validationError) throw new TierValidationError(validationError);
        return tx.b2BPriceTier.update({
          where: { id: current.id },
          data: candidate,
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: tier.productId, ...candidate },
    });
    return res.json({ data: tier });
  } catch (error) {
    if (error instanceof Error && error.message === 'TIER_NOT_FOUND') {
      return res.status(404).json({ error: 'Tier no encontrado.' });
    }
    if (error instanceof TierValidationError) {
      return res.status(400).json({ error: error.message });
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return res.status(409).json({ error: 'Los precios cambiaron; vuelve a intentarlo.' });
    }
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
