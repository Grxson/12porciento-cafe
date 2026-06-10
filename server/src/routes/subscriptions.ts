import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';
import { emitEvent } from '../socket';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos de suscripción. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const PLAN_SLOTS: Record<string, { min: number; max: number }> = {
  FUNDADOR:    { min: 2, max: 2 },
  EXPLORADOR:  { min: 2, max: 3 },
  CONNOISSEUR: { min: 3, max: 3 },
  EMPRESARIAL: { min: 10, max: 99 },
};

// POST / — create subscription with selected coffees
router.post('/', createLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan, frequency = 'monthly', grindPreference = 'GRANO', items = [] } = req.body;

    // Derive userId from token — ignore body to prevent IDOR
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(
          authHeader.replace('Bearer ', ''),
          process.env.JWT_SECRET!,
        ) as { id: string; role?: string };
        if (payload.role === 'USER') userId = payload.id;
      } catch { /* anonymous subscription */ }
    }

    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
      return;
    }
    if (!email || typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: 'Email inválido' });
      return;
    }
    const normalizedEmail = email.toLowerCase().trim();

    const slots = PLAN_SLOTS[plan];
    if (!slots) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    if (!Array.isArray(items) || items.length < slots.min || items.length > slots.max) {
      res.status(400).json({ error: `El plan ${plan} requiere entre ${slots.min} y ${slots.max} cafés seleccionados` });
      return;
    }

    const subItemsInclude = {
      items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } },
    };

    // email is globally @unique, so check for ANY existing subscription (not just
    // ACTIVE/PAUSED). A CANCELLED one must be reactivated, otherwise create() hits
    // a P2002 unique-constraint error and 500s.
    const existing = await prisma.subscription.findUnique({ where: { email: normalizedEmail } });
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'PAUSED')) {
      res.status(409).json({ error: 'Ya tienes una suscripción activa o pausada con este email' });
      return;
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + (frequency === 'bimonthly' ? 2 : 1));

    let subscription;
    if (existing) {
      // Reactivate the cancelled subscription: replace its coffees and reset state.
      const [, updated] = await prisma.$transaction([
        prisma.subscriptionItem.deleteMany({ where: { subscriptionId: existing.id } }),
        prisma.subscription.update({
          where: { id: existing.id },
          data: {
            name: name.trim(), phone, plan, frequency, grindPreference, nextBilling,
            status: 'ACTIVE', fulfillmentStatus: 'PENDIENTE',
            ...(userId ? { userId } : {}),
            items: { create: items.map((productId: string) => ({ productId })) },
          },
          include: subItemsInclude,
        }),
      ]);
      subscription = updated;
    } else {
      subscription = await prisma.subscription.create({
        data: {
          name: name.trim(), email: normalizedEmail, phone, plan, frequency, grindPreference, nextBilling,
          ...(userId ? { userId } : {}),
          items: { create: items.map((productId: string) => ({ productId })) },
        },
        include: subItemsInclude,
      });
    }

    emitEvent({
      event: 'subscription_created',
      title: 'Nueva suscripción',
      message: `${subscription.name} se suscribió al plan ${subscription.plan}`,
      data: { subscriptionId: subscription.id, plan: subscription.plan },
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

// PUT /:id/admin — admin: edit plan, frequency, grindPreference, and coffee items
router.put('/:id/admin', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { plan, frequency, grindPreference, items } = req.body as {
      plan?: string; frequency?: string; grindPreference?: string; items?: string[];
    };

    const sub = await prisma.subscription.findUnique({ where: { id: req.params.id } });
    if (!sub) {
      res.status(404).json({ error: 'Suscripción no encontrada' });
      return;
    }

    // Determine the effective plan (new one if provided, else current) for slot validation
    const effectivePlan = plan ?? sub.plan;
    const slots = PLAN_SLOTS[effectivePlan];
    if (!slots) {
      res.status(400).json({ error: 'Plan inválido' });
      return;
    }

    // If items provided, validate against the effective plan's slot range
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length < slots.min || items.length > slots.max) {
        res.status(400).json({ error: `El plan ${effectivePlan} requiere entre ${slots.min} y ${slots.max} cafés` });
        return;
      }
    } else if (plan) {
      // Plan changed without new items: ensure the existing item count still fits the new plan
      const currentItemCount = await prisma.subscriptionItem.count({ where: { subscriptionId: sub.id } });
      if (currentItemCount < slots.min || currentItemCount > slots.max) {
        res.status(400).json({
          error: `El plan ${effectivePlan} requiere entre ${slots.min} y ${slots.max} cafés. Actualiza la selección de cafés al mismo tiempo.`,
        });
        return;
      }
    }

    const updateData: any = {};
    if (plan) updateData.plan = plan;
    if (frequency) updateData.frequency = frequency;
    if (grindPreference) updateData.grindPreference = grindPreference;

    // Replace items + update fields atomically when items are provided
    if (items !== undefined) {
      const [, updated] = await prisma.$transaction([
        prisma.subscriptionItem.deleteMany({ where: { subscriptionId: sub.id } }),
        prisma.subscription.update({
          where: { id: sub.id },
          data: {
            ...updateData,
            items: { create: items.map((productId: string) => ({ productId })) },
          },
          include: {
            items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } },
          },
        }),
      ]);
      res.json(updated);
      return;
    }

    // No items change — just update scalar fields
    const updated = await prisma.subscription.update({
      where: { id: sub.id },
      data: updateData,
      include: {
        items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } },
      },
    });
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al actualizar suscripción' });
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
