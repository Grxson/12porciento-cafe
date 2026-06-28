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
    const { name, email, phone, plan, frequency = 'monthly', grindPreference = 'GRANO', items = [], paymentMethodId } = req.body;

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
      if (existing.userId && existing.userId === userId) {
        // Upgrade: authenticated user changing plan on own subscription
        // Falls through to update logic below
      } else if (!userId) {
        res.status(409).json({ error: 'Ya tienes una suscripción activa o pausada con este email' });
        return;
      } else {
        // Same email, different user — shouldn't happen but protect anyway
        res.status(409).json({ error: 'Este email ya tiene una suscripción activa' });
        return;
      }
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

        // Find or create a Stripe product for this plan (price_data needs product ID, not product_data)
        const productName = `Suscripción 12% — ${plan}`;
        const existingProducts = await stripe.products.list({ active: true, limit: 100 });
        let stripeProduct = existingProducts.data.find((p) => p.name === productName);
        if (!stripeProduct) {
          stripeProduct = await stripe.products.create({
            name: productName,
            description: `Plan de suscripción ${plan} — 12% Café de Especialidad`,
          });
        }

        const stripeSub = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [
            {
              price_data: {
                currency: 'mxn',
                product: stripeProduct.id,
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

        // Attach payment method if provided
        if (paymentMethodId && typeof paymentMethodId === 'string') {
          try {
            await stripe.paymentMethods.attach(paymentMethodId, { customer: stripeCustomerId });
            await stripe.customers.update(stripeCustomerId, {
              invoice_settings: { default_payment_method: paymentMethodId },
            });
            await stripe.subscriptions.update(stripeSub.id, {
              default_payment_method: paymentMethodId,
            });
          } catch (pmErr) {
            console.warn('[subscription] Could not attach payment method:', pmErr);
          }
        }
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
      title: existing && existing.status !== 'CANCELLED' ? 'Plan actualizado' : 'Nueva suscripción',
      message: existing && existing.status !== 'CANCELLED'
        ? `${subscription.name} cambió al plan ${subscription.plan}`
        : `${subscription.name} se suscribió al plan ${subscription.plan}`,
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
  async function syncStripeSubscription(subId: string, newPlan: string | undefined, newFrequency: string | undefined, newItems: string[] | undefined) {
    const current = await prisma.subscription.findUnique({
      where: { id: subId },
      include: { items: { include: { product: { select: { price: true } } } } },
    });
    if (!current?.stripeSubscriptionId) return;
    
    try {
      const totalPrice = current.items.reduce((sum, item) => sum + Number(item.product.price), 0);
      const amountInCents = Math.round(totalPrice * 100);
      if (amountInCents < 100) return;
      
      const stripeSub = await stripe.subscriptions.retrieve(current.stripeSubscriptionId);
      const stripeItemId = stripeSub.items.data[0]?.id;
      if (!stripeItemId) return;
      
      await stripe.subscriptions.update(current.stripeSubscriptionId, {
        items: [{
          id: stripeItemId,
          price_data: {
            currency: 'mxn',
            product: stripeSub.items.data[0].price.product as string,
            unit_amount: amountInCents,
            recurring: {
              interval: 'month',
              interval_count: current.frequency === 'bimonthly' ? 2 : 1,
            },
          },
        }],
        proration_behavior: 'none',
      });
      console.log(`[subscription] Stripe synced for ${subId}`);
    } catch (stripeErr) {
      console.warn(`[subscription] Failed to sync Stripe for ${subId}:`, stripeErr);
    }
  }

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
      await syncStripeSubscription(req.params.id, plan, frequency, items);
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
    await syncStripeSubscription(req.params.id, plan, frequency, items);
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const skip = (page - 1) * pageSize;
    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: {
          items: {
            include: { product: { select: { id: true, name: true, slug: true, imageUrl: true } } },
          },
        },
      }),
      prisma.subscription.count({ where }),
    ]);
    res.json({ data: subscriptions, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
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

// POST /setup-intent — create Stripe SetupIntent for payment method collection
router.post('/setup-intent', async (req: Request, res: Response) => {
  try {
    let stripeCustomerId: string;
    const { email, name } = req.body;

    if (email && name) {
      stripeCustomerId = await ensureStripeCustomer(email, name);
    } else {
      // Create ephemeral customer for guests
      const customer = await stripe.customers.create({
        metadata: { source: '12porciento-subscription-setup' },
      });
      stripeCustomerId = customer.id;
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.json({ clientSecret: setupIntent.client_secret });
  } catch (err) {
    console.error('[subscription] setup-intent error:', err);
    res.status(500).json({ error: 'Error al crear configuración de pago' });
  }
});

// GET /b2b-inquiries — admin list B2B inquiries
router.get('/b2b-inquiries', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, page, pageSize } = req.query;
    const where: any = {};

    if (status) where.status = status;
    if (search) {
      where.OR = [
        { empresa: { contains: search as string } },
        { contactoNombre: { contains: search as string } },
        { contactoEmail: { contains: search as string } },
      ];
    }

    const psRaw = parseInt(pageSize as string);
    const ps = Number.isInteger(psRaw) ? Math.min(Math.max(psRaw, 1), 200) : 50;
    const pgRaw = parseInt(page as string);
    const pg = Number.isInteger(pgRaw) ? Math.max(pgRaw - 1, 0) : 0;

    const [inquiries, total] = await prisma.$transaction([
      prisma.b2BInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: ps,
        skip: pg * ps,
      }),
      prisma.b2BInquiry.count({ where }),
    ]);

    res.json({ data: inquiries, total, page: pg + 1, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch {
    res.status(500).json({ error: 'Error al listar consultas B2B' });
  }
});

// GET /b2b-inquiries/:id — admin inquiry detail
router.get('/b2b-inquiries/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const inquiry = await prisma.b2BInquiry.findUnique({ where: { id: req.params.id } });
    if (!inquiry) {
      res.status(404).json({ error: 'Consulta no encontrada' });
      return;
    }
    res.json(inquiry);
  } catch {
    res.status(500).json({ error: 'Error al obtener consulta' });
  }
});

// PUT /b2b-inquiries/:id/status — admin update status
router.put('/b2b-inquiries/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const valid = ['NEW', 'CONTACTED', 'RESOLVED'];
    if (!valid.includes(status)) {
      res.status(400).json({ error: 'Estado inválido. Valores: NEW, CONTACTED, RESOLVED' });
      return;
    }

    const inquiry = await prisma.b2BInquiry.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(inquiry);
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

// PATCH /pause — pause subscription (user)
router.patch('/pause', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { reason, until } = req.body;
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'ACTIVE' },
    });
    if (!subscription) {
      res.status(404).json({ error: 'No tienes una suscripción activa' });
      return;
    }
    if (subscription.maxSkips > 0 && subscription.skipCount >= subscription.maxSkips) {
      res.status(400).json({ error: 'Has alcanzado el máximo de pausas permitidas' });
      return;
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        pausedAt: new Date(),
        pausedUntil: until ? new Date(until) : null,
        pausedReason: reason || null,
        skipCount: { increment: 1 },
        status: 'PAUSED',
      },
    });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Error al pausar suscripción' });
  }
});

// PATCH /resume — resume paused subscription (user)
router.patch('/resume', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: 'PAUSED' },
    });
    if (!subscription) {
      res.status(404).json({ error: 'No tienes una suscripción pausada' });
      return;
    }
    const updated = await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        pausedAt: null,
        pausedUntil: null,
        pausedReason: null,
        status: 'ACTIVE',
      },
    });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Error al reanudar suscripción' });
  }
});

// GET /pause-info — get pause status for current user
router.get('/pause-info', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { userId: req.user!.id, status: { in: ['ACTIVE', 'PAUSED'] } },
      select: {
        id: true, status: true, pausedAt: true, pausedUntil: true,
        pausedReason: true, skipCount: true, maxSkips: true,
      },
    });
    if (!subscription) {
      res.status(404).json({ error: 'No tienes suscripción' });
      return;
    }
    res.json({ data: subscription });
  } catch {
    res.status(500).json({ error: 'Error al obtener información de pausa' });
  }
});

export default router;
