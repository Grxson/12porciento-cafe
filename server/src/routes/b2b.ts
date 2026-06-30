import { Router, Response, Request } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// Public: GET /api/b2b/catalog
router.get('/catalog', async (_req: Request, res: Response) => {
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
        weight: true,
        sku: true,
        b2bPriceTiers: { orderBy: { minQty: 'asc' } },
      },
      orderBy: { name: 'asc' },
    });
    res.json({ data: products });
  } catch (err) {
    console.error('[b2b] GET /catalog', err);
    res.status(500).json({ error: 'Error al obtener catálogo B2B' });
  }
});

// Public: POST /api/b2b/inquiry
router.post('/inquiry', async (req: Request, res: Response) => {
  try {
    const {
      businessName,
      contactoNombre,
      contactoEmail,
      contactoTelefono,
      rfc,
      volumenEstimado,
      giroNegocio,
    } = req.body;
    if (!businessName?.trim() || !contactoEmail?.trim()) {
      return res.status(400).json({ error: 'Empresa y email de contacto son requeridos' });
    }

    const inquiry = await prisma.b2BInquiry.create({
      data: {
        empresa: businessName.trim(),
        rfc: rfc?.trim() || '',
        contactoNombre: contactoNombre?.trim() || '',
        contactoEmail: contactoEmail.trim().toLowerCase(),
        contactoTelefono: contactoTelefono?.trim() || '',
        volumenEstimado: volumenEstimado?.trim() || '',
        giroNegocio: giroNegocio?.trim() || null,
        status: 'NEW',
      },
    });

    res.status(201).json({
      data: {
        inquiryId: inquiry.id,
        message: 'Solicitud recibida. Te contactaremos en 24-48 horas.',
      },
    });
  } catch (err) {
    console.error('[b2b] POST /inquiry', err);
    res.status(500).json({ error: 'Error al enviar solicitud' });
  }
});

// Admin: GET /api/b2b/tiers/:productId
router.get('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tiers = await prisma.b2BPriceTier.findMany({
      where: { productId: req.params.productId },
      orderBy: { minQty: 'asc' },
    });
    res.json({ data: tiers });
  } catch (err) {
    console.error('[b2b] GET /tiers/:productId', err);
    res.status(500).json({ error: 'Error al obtener tiers' });
  }
});

// Admin: POST /api/b2b/tiers/:productId
router.post('/tiers/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { minQty, maxQty, pricePerUnit } = req.body;
    if (!minQty || !pricePerUnit) {
      return res.status(400).json({ error: 'minQty y pricePerUnit son requeridos' });
    }
    const tier = await prisma.b2BPriceTier.create({
      data: {
        productId: req.params.productId,
        minQty: parseInt(minQty),
        maxQty: maxQty ? parseInt(maxQty) : null,
        pricePerUnit: parseFloat(pricePerUnit),
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: { productId: req.params.productId, minQty, pricePerUnit },
    });
    res.status(201).json({ data: tier });
  } catch (err) {
    console.error('[b2b] POST /tiers/:productId', err);
    res.status(500).json({ error: 'Error al crear tier' });
  }
});

// Admin: DELETE /api/b2b/tiers/item/:tierId
router.delete('/tiers/item/:tierId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tier = await prisma.b2BPriceTier.findUnique({ where: { id: req.params.tierId } });
    if (!tier) return res.status(404).json({ error: 'Tier no encontrado' });
    await prisma.b2BPriceTier.delete({ where: { id: req.params.tierId } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'B2BPriceTier',
      entityId: tier.id,
      metadata: {},
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[b2b] DELETE /tiers/item/:tierId', err);
    res.status(500).json({ error: 'Error al eliminar tier' });
  }
});

// Admin: GET /api/b2b/orders
router.get('/orders', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = 20;
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where: { orderType: 'B2B' },
        include: { items: { include: { product: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.order.count({ where: { orderType: 'B2B' } }),
    ]);
    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[b2b] GET /orders', err);
    res.status(500).json({ error: 'Error al obtener pedidos B2B' });
  }
});

export default router;
