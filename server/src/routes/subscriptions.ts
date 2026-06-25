import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import Stripe from 'stripe';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';
import { emitEvent } from '../socket';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

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

async function ensureStripeCustomer(email: string, name: string, phone?: string): Promise<string> {
  const existing = await stripe.customers.list({ email: email.toLowerCase(), limit: 1 });
  if (existing.data.length > 0) return existing.data[0].id;

  const customer = await stripe.customers.create({
    email: email.toLowerCase(),
    name,
    ...(phone ? { phone } : {}),
    metadata: { source: '12porciento-subscription' },
  });
  return customer.id;
}

// POST / — create subscription with selected coffees
router.post('/', createLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan, frequency = 'monthly', grindPreference = 'GRANO', items = [] } = req.body;

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

    const productRecords = await prisma.product.findMany({
      where: { id: { in: items as string[] } },
      select: { id: true, name: true, price: true, isActive: true, stock: true },
    });
    if (productRecords.length !== items.length) {
      res.status(400).json({ error: 'Uno o más productos no existen' });
      return;
    }
    for (const p of productRecords) {
      if (!p.isActive) {
        res.status(400).json({ error: `El producto "${p.name}" no está disponible` });
        return;
      }
      if (p.stock < 1) {
        res.status(400).json({ error: `El producto "${p.name}" está agotado` });
        return;
      }
    }

    const subItemsInclude = {
      items: { include: { product: { select: { id: true, name: true, slug: true, imageUrl: true, price: true, scaScore: true } } } },
    };

    const existing = await prisma.subscription.findUnique({ where: { email: normalizedEmail } });
    if (existing && (existing.status === 'ACTIVE' || existing.status === 'PAUSED')) {
      res.status(409).json({ error: 'Ya tienes una suscripción activa o pausada con este email' });
      return;
    }

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + (frequency === 'bimonthly' ? 2 : 1));

    let stripeCustomerId: string | undefined;
    try {
      stripeCustomerId = await ensureStripeCustomer(normalizedEmail, name.trim(), phone);
    } catch (stripeErr) {
      console.warn('[subscription] Could not create Stripe customer:', stripeErr);
    }

    let stripeSubscriptionId: string | undefined;
    if (stripeCustomerId) {
      try {
        const priceInCents = Math.round(
          productRecords.reduce((sum: number, p: { price: number }) => sum + Number(p.price), 0) * 100,
        );
        if (priceInCents < 100) {
          throw new Error('El total de la suscripción debe ser al menos $10 MXN');
        }

        const stripeSub = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [
            {
              price_data: {
                currency: 'mxn',
                product_data: {
                  name: `Suscripción 12% — ${plan}`,
                  description: productRecords.map((p: { name: string }) => p.name).join(', '),
                },
                unit_amount: priceInCents,
                recurring: {
                  interval: frequency === 'bimonthly' ? 'month' : 'month',
                  interval_count: frequency === 'bimonthly' ? 2 : 1,
                },
              },
            },
          ],
        });

        stripeSubscriptionId = stripeSub.id;
      } catch (stripeErr) {
        console.warn('[subscription] Could not create Stripe subscription:', stripeErr);
      }
    }

    let subscription;
    if (existing) {
      const [, updated] = await prisma.$transaction([
        prisma.subscriptionItem.deleteMany({ where: { subscriptionId: existing.id } }),
        prisma.subscription.update({
          where: { id: existing.id },
          data: {
            name: name.trim(), phone, plan, frequency, grindPreference, nextBilling,
            status: 'ACTIVE', fulfillmentStatus: 'PENDIENTE',
            ...(userId ? { userId } : {}),
            ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
            ...(stripeCustomerId ? { stripeCustomerId } : {}),
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
          ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
          ...(stripeCustomerId ? { stripeCustomerId } : {}),
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

// POST /b2b-inquiry — public B2B inquiry submission
router.post('/b2b-inquiry', async (req: Request, res: Response) => {
  try {
    const { empresa, rfc, contactoNombre, contactoEmail, contactoTelefono, volumenEstimado, giroNegocio } = req.body;

    // Validate required fields
    if (!empresa || typeof empresa !== 'string' || empresa.trim().length === 0) {
      res.status(400).json({ error: 'Empresa es requerida' });
      return;
    }
    if (!rfc || typeof rfc !== 'string' || rfc.trim().length === 0) {
      res.status(400).json({ error: 'RFC es requerido' });
      return;
    }
    if (!contactoNombre || typeof contactoNombre !== 'string' || contactoNombre.trim().length === 0) {
      res.status(400).json({ error: 'Nombre de contacto es requerido' });
      return;
    }
    if (!contactoEmail || typeof contactoEmail !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactoEmail)) {
      res.status(400).json({ error: 'Email de contacto inválido' });
      return;
    }
    if (!contactoTelefono || typeof contactoTelefono !== 'string' || contactoTelefono.trim().length === 0) {
      res.status(400).json({ error: 'Teléfono de contacto es requerido' });
      return;
    }
    if (!volumenEstimado || typeof volumenEstimado !== 'string' || volumenEstimado.trim().length === 0) {
      res.status(400).json({ error: 'Volumen estimado es requerido' });
      return;
    }

    // Create B2B inquiry record
    const inquiry = await prisma.b2BInquiry.create({
      data: {
        empresa: empresa.trim(),
        rfc: rfc.trim(),
        contactoNombre: contactoNombre.trim(),
        contactoEmail: contactoEmail.toLowerCase().trim(),
        contactoTelefono: contactoTelefono.trim(),
        volumenEstimado,
        ...(giroNegocio ? { giroNegocio } : {}),
      },
    });

    res.status(201).json({ message: 'Inquiry received. We\'ll contact you within 24 hours.', id: inquiry.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear solicitud B2B' });
  }
});

export default router;
