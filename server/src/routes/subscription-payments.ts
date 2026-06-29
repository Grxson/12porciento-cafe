import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';
import { emitEvent } from '../socket';

const router = Router();
export const webhookRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

// GET /user/:subscriptionId/next-billing
router.get('/user/:subscriptionId/next-billing', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.subscriptionId, userId: req.user!.id },
      select: { nextBilling: true, status: true, stripeSubscriptionId: true, frequency: true },
    });
    if (!sub) return res.status(404).json({ error: 'Suscripción no encontrada' });

    const daysUntil = Math.ceil((new Date(sub.nextBilling).getTime() - Date.now()) / 86400000);
    res.json({
      nextBilling: sub.nextBilling,
      status: sub.status,
      frequency: sub.frequency,
      daysUntilBilling: daysUntil,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener próxima fecha' });
  }
});

// GET /user/:subscriptionId/payments
router.get('/user/:subscriptionId/payments', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const sub = await prisma.subscription.findFirst({
      where: { id: req.params.subscriptionId, userId: req.user!.id },
    });
    if (!sub) return res.status(404).json({ error: 'Suscripción no encontrada' });

    const payments = await prisma.subscriptionPayment.findMany({
      where: { subscriptionId: sub.id },
      orderBy: { billingDate: 'desc' },
      take: 50,
    });

    res.json({
      subscriptionId: sub.id,
      plan: sub.plan,
      nextBilling: sub.nextBilling,
      payments,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
});

// POST / — handles invoice.payment_succeeded and invoice.payment_failed
webhookRouter.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: any;
  if (webhookSecret) {
    if (!sig) {
      return res.status(400).json({ error: 'Missing stripe-signature header' });
    }
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error('[sub-webhook] Signature failed:', err.message);
      return res.status(400).json({ error: err.message });
    }
  } else {
    if (process.env.NODE_ENV === 'production') {
      console.error('[sub-webhook] STRIPE_WEBHOOK_SECRET not set in production');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }
    // Dev/test: no secret configured, trust body
    event = req.body as any;
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice: any = event.data.object;
    const stripeSubId: string = invoice.subscription;
    if (!stripeSubId) return res.json({ received: true });

    const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } });
    if (!sub) return res.json({ received: true, status: 'not_found' });

    const existing = invoice.id
      ? await prisma.subscriptionPayment.findUnique({ where: { stripeInvoiceId: invoice.id } })
      : null;
    if (existing) return res.json({ received: true, status: 'already_processed' });

    const monthsToAdd = sub.frequency === 'bimonthly' ? 2 : 1;
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + monthsToAdd);

    try {
      const payment = await prisma.subscriptionPayment.create({
        data: {
          subscriptionId: sub.id,
          stripeInvoiceId: invoice.id || null,
          stripeChargeId: invoice.charge || null,
          amount: (invoice.amount_paid || 0) / 100,
          status: 'SUCCEEDED',
          billingDate: new Date(),
        },
      });

      await prisma.subscription.update({
        where: { id: sub.id },
        data: { lastPaymentDate: new Date(), lastPaymentId: payment.id, nextBilling, failedAttempts: 0 },
      });

      console.log(`[sub-webhook] Payment processed for subscription ${sub.id}`);
      res.json({ received: true, status: 'processed' });
    } catch (err) {
      console.error('[sub-webhook] Error saving payment:', err);
      res.json({ received: true, status: 'error' });
    }

  } else if (event.type === 'invoice.payment_failed') {
    const invoice: any = event.data.object;
    const stripeSubId: string = invoice.subscription;
    if (!stripeSubId) return res.json({ received: true });

    const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSubId } });
    if (!sub) return res.json({ received: true, status: 'not_found' });

    // Idempotency check for failed payments
    if (invoice.id) {
      const existingFailed = await prisma.subscriptionPayment.findUnique({
        where: { stripeInvoiceId: invoice.id },
      });
      if (existingFailed) return res.json({ received: true, status: 'already_processed' });
    }

    await prisma.subscriptionPayment.create({
      data: {
        subscriptionId: sub.id,
        stripeInvoiceId: invoice.id || null,
        amount: (invoice.amount_due || 0) / 100,
        status: 'FAILED',
        billingDate: new Date(),
        errorMessage: invoice.last_finalization_error?.message || 'Payment failed',
      },
    });

    await prisma.subscription.update({
      where: { id: sub.id },
      data: {
        failedAttempts: { increment: 1 },
        lastFailureReason: invoice.last_finalization_error?.message || 'Payment failed',
      },
    });

    console.log(`[sub-webhook] Payment failed for subscription ${sub.id}`);
    res.json({ received: true, status: 'failure_processed' });

  } else if (event.type === 'customer.subscription.deleted') {
    const stripeSub = event.data.object as { id: string };
    if (!stripeSub.id) { res.json({ received: true }); return; }

    const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSub.id } });
    if (!sub) { res.json({ received: true }); return; }

    await prisma.subscription.update({
      where: { id: sub.id },
      data: { status: 'CANCELLED' },
    });
    console.log(`[sub-webhook] Subscription cancelled: ${sub.id}`);
    emitEvent({
      event: 'subscription_cancelled',
      title: 'Suscripción cancelada',
      message: `Suscripción cancelada desde Stripe: ${sub.email}`,
      targetUserId: sub.userId ?? undefined,
      data: { subscriptionId: sub.id, email: sub.email },
    });
    res.json({ received: true, status: 'cancelled' });

  } else if (event.type === 'customer.subscription.updated') {
    const stripeSub = event.data.object as { id: string; status?: string; items?: { data: { price?: { unit_amount?: number } }[] } };
    if (!stripeSub.id) { res.json({ received: true }); return; }

    const sub = await prisma.subscription.findUnique({ where: { stripeSubscriptionId: stripeSub.id } });
    if (!sub) { res.json({ received: true }); return; }

    const updateData: { status?: string } = {};
    if (stripeSub.status === 'active') updateData.status = 'ACTIVE';
    else if (stripeSub.status === 'past_due') updateData.status = 'PAUSED';
    else if (stripeSub.status === 'canceled') updateData.status = 'CANCELLED';

    if (Object.keys(updateData).length > 0) {
      await prisma.subscription.update({ where: { id: sub.id }, data: updateData });
    }
    res.json({ received: true, status: 'updated' });

  } else {
    res.json({ received: true });
  }
});

// GET /admin/all — admin list of all subscription payments
router.get('/admin/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
    const { search, status, plan, startDate, endDate } = req.query;

    const where: any = {};
    if (search) {
      where.OR = [
        { subscription: { name: { contains: search as string, mode: 'insensitive' } } },
        { subscription: { email: { contains: search as string, mode: 'insensitive' } } },
        { stripeInvoiceId: { contains: search as string } },
      ];
    }
    if (status) where.status = status as string;
    if (plan) where.subscription = { ...where.subscription, plan: plan as string };
    if (startDate) where.billingDate = { ...where.billingDate, gte: new Date(startDate as string) };
    if (endDate) where.billingDate = { ...where.billingDate, lte: new Date(endDate as string) };

    const [payments, total] = await Promise.all([
      prisma.subscriptionPayment.findMany({
        where,
        include: { subscription: { select: { name: true, email: true, plan: true } } },
        orderBy: { billingDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.subscriptionPayment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[admin/subscription-payments] Error:', err);
    res.status(500).json({ error: 'Error al cargar pagos' });
  }
});

export default router;
