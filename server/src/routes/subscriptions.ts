import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';

const router = Router();

const PLAN_SLOTS: Record<string, { min: number; max: number }> = {
  FUNDADOR:    { min: 2, max: 2 },
  EXPLORADOR:  { min: 2, max: 3 },
  CONNOISSEUR: { min: 3, max: 3 },
  EMPRESARIAL: { min: 10, max: 99 },
};

// POST / — create subscription with selected coffees
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan, frequency = 'monthly', grindPreference = 'GRANO', items = [], userId } = req.body;

    const slots = PLAN_SLOTS[plan];
    if (!slots) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    if (!Array.isArray(items) || items.length < slots.min || items.length > slots.max) {
      res.status(400).json({ error: `El plan ${plan} requiere entre ${slots.min} y ${slots.max} cafés seleccionados` });
      return;
    }

    const existing = await prisma.subscription.findFirst({
      where: { email, status: { in: ['ACTIVE', 'PAUSED'] } },
    });
    if (existing) {
      res.status(409).json({ error: 'Ya tienes una suscripción activa o pausada con este email' });
      return;
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + (frequency === 'bimonthly' ? 2 : 1));

    const subscription = await prisma.subscription.create({
      data: {
        name, email, phone, plan, frequency, grindPreference, nextBilling,
        ...(userId ? { userId } : {}),
        items: { create: items.map((productId: string) => ({ productId })) },
      },
      include: { items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } } },
    });

    res.status(201).json(subscription);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

// PUT /:id/items — replace coffee selection (only if PENDIENTE)
router.put('/:id/items', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { items, grindPreference } = req.body as { items: string[]; grindPreference?: string };

    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.id, userId: req.user!.id },
    });

    if (!sub) {
      res.status(404).json({ error: 'Suscripción no encontrada' });
      return;
    }

    if (sub.fulfillmentStatus !== 'PENDIENTE') {
      res.status(400).json({ error: 'No puedes editar tu selección mientras el pedido está en preparación o tránsito' });
      return;
    }

    const slots = PLAN_SLOTS[sub.plan];
    if (!slots || !Array.isArray(items) || items.length < slots.min || items.length > slots.max) {
      res.status(400).json({ error: `El plan ${sub.plan} requiere entre ${slots?.min ?? 2} y ${slots?.max ?? 99} cafés` });
      return;
    }

    await prisma.$transaction([
      prisma.subscriptionItem.deleteMany({ where: { subscriptionId: sub.id } }),
      prisma.subscriptionItem.createMany({
        data: items.map((productId: string) => ({ subscriptionId: sub.id, productId })),
      }),
    ]);

    const updateData: any = {};
    if (grindPreference) updateData.grindPreference = grindPreference;

    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: updateData,
      include: { items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } } },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar selección' });
  }
});

// GET / — admin list
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, slug: true, imageUrl: true } } },
        },
      },
    });
    res.json(subscriptions);
  } catch {
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

// PUT /:id/status — admin: ACTIVE/PAUSED/CANCELLED
router.put('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['ACTIVE', 'PAUSED', 'CANCELLED'].includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const sub = await prisma.subscription.update({ where: { id: req.params.id }, data: { status } });
    res.json(sub);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

// PUT /:id/fulfillment — admin: PENDIENTE/PREPARANDO/ENVIADO/ENTREGADO
router.put('/:id/fulfillment', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { fulfillmentStatus } = req.body;
    const valid = ['PENDIENTE', 'PREPARANDO', 'ENVIADO', 'ENTREGADO'];
    if (!valid.includes(fulfillmentStatus)) {
      res.status(400).json({ error: 'Estado de envío inválido' });
      return;
    }

    const updateData: any = { fulfillmentStatus };

    if (fulfillmentStatus === 'ENTREGADO') {
      const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
      if (sub) {
        const next = new Date();
        next.setMonth(next.getMonth() + (sub.frequency === 'bimonthly' ? 2 : 1));
        updateData.nextBilling = next;
      }
    }

    const updated = await prisma.subscription.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json(updated);
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado de envío' });
  }
});

export default router;
