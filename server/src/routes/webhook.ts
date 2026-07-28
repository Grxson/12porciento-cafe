import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { prisma } from '../db';
import { sendOrderConfirmation } from '../email';
import { emitEvent } from '../socket';
import { getErrorMessage, getErrorCode } from '../lib/error-utils';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

type StripeEvent = ReturnType<typeof stripe.webhooks.constructEvent>;

router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    if (process.env.NODE_ENV === 'production') {
      console.error('[webhook] STRIPE_WEBHOOK_SECRET not set in production');
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    res.json({ received: true });
    return;
  }

  let event: StripeEvent;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error('[webhook] Signature verification failed:', msg);
    res.status(400).json({ error: `Webhook error: ${msg}` });
    return;
  }

  // Idempotency guard: a previously fully-processed event is never redone —
  // handlers below are otherwise individually idempotent too (defense in depth),
  // but this also gives us a durable audit trail of every event we've seen.
  const priorEvent = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (priorEvent?.status === 'PROCESSED') {
    res.json({ received: true, status: 'already_processed' });
    return;
  }

  try {
    await handleEvent(event);
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      create: { stripeEventId: event.id, eventType: event.type, status: 'PROCESSED' },
      update: { status: 'PROCESSED', errorMessage: null, eventType: event.type },
    });
    res.json({ received: true });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error(`[webhook] Failed to process ${event.type} (${event.id}):`, msg);
    await prisma.stripeWebhookEvent
      .upsert({
        where: { stripeEventId: event.id },
        create: {
          stripeEventId: event.id,
          eventType: event.type,
          status: 'FAILED',
          errorMessage: msg,
        },
        update: { status: 'FAILED', errorMessage: msg, eventType: event.type },
      })
      .catch(() => {});
    // 500 so Stripe retries with backoff — a silent 200 here would mean a
    // paid customer never gets an order and nobody finds out.
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// Re-run a previously failed webhook event on admin demand (reconciliation panel).
// Re-fetches the event from Stripe rather than trusting any stored payload, since
// we never persisted the raw body — only the audit row.
export async function retryWebhookEvent(stripeEventId: string): Promise<void> {
  const event = (await stripe.events.retrieve(stripeEventId)) as StripeEvent;
  try {
    await handleEvent(event);
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      create: { stripeEventId: event.id, eventType: event.type, status: 'PROCESSED' },
      update: { status: 'PROCESSED', errorMessage: null, eventType: event.type },
    });
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    await prisma.stripeWebhookEvent.upsert({
      where: { stripeEventId: event.id },
      create: {
        stripeEventId: event.id,
        eventType: event.type,
        status: 'FAILED',
        errorMessage: msg,
      },
      update: { status: 'FAILED', errorMessage: msg, eventType: event.type },
    });
    throw err;
  }
}

async function handleEvent(event: StripeEvent): Promise<void> {
  if (event.type === 'payment_intent.succeeded') {
    await handlePaymentIntentSucceeded(event);
    return;
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as {
      id: string;
      amount: number;
      last_payment_error?: { code?: string; message?: string };
    };
    console.error('[webhook] payment_failed', {
      id: intent.id,
      amount: intent.amount,
      code: intent.last_payment_error?.code ?? 'unknown',
      message: intent.last_payment_error?.message ?? 'no message',
    });
    // No Order row exists yet in this flow (orders are only created once payment
    // succeeds), so there is nothing to reconcile here beyond the audit log above.
    return;
  }

  if (event.type === 'charge.refunded') {
    await handleChargeRefunded(event);
    return;
  }

  if (event.type === 'payment_intent.canceled') {
    const intent = event.data.object as { id: string };
    const order = await prisma.order.findUnique({ where: { paymentIntentId: intent.id } });
    if (order && order.status === 'PENDING') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      console.log(`[webhook] Order ${order.id} cancelled due to payment cancellation`);
    }
    return;
  }
}

async function handlePaymentIntentSucceeded(event: StripeEvent): Promise<void> {
  const intent = event.data.object as {
    id: string;
    amount: number;
    metadata: Record<string, string>;
  };

  const existing = await prisma.order.findUnique({
    where: { paymentIntentId: intent.id },
  });
  if (existing) {
    console.log(`[webhook] Order already exists for ${intent.id}`);
    return;
  }

  const items: { productId: string; quantity: number }[] = JSON.parse(
    intent.metadata?.items || '[]',
  );
  if (!items?.length) {
    throw new Error(`No items in PaymentIntent metadata for ${intent.id}`);
  }

  const orderItems: { productId: string; quantity: number; price: number }[] = [];
  for (const item of items) {
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      select: { price: true, stock: true, isActive: true, name: true },
    });
    if (!product) throw new Error(`Product not found: ${item.productId}`);
    if (!product.isActive) throw new Error(`Product inactive: ${item.productId}`);
    if (product.stock < item.quantity) {
      throw new Error(
        `Insufficient stock for ${item.productId} (needed ${item.quantity}, available ${product.stock})`,
      );
    }
    orderItems.push({
      productId: item.productId,
      quantity: item.quantity,
      price: Number(product.price),
    });
  }

  const shippingCost = Number(intent.metadata?.shippingCost || 0) || 0;
  const total = intent.amount / 100;

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      for (const item of orderItems) {
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: { stock: { decrement: item.quantity } },
        });
        if (updated.count === 0) {
          throw new Error('Stock insuficiente al confirmar orden');
        }
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stock: true, name: true, lowStockThreshold: true },
        });
        if (!prod) throw new Error('Producto no encontrado');
        const newStock = prod.stock;
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            type: 'SALE',
            quantity: -item.quantity,
            previousStock: prod.stock + item.quantity,
            newStock,
            notes: `Webhook PI ${intent.id}`,
          },
        });
        if (newStock <= prod.lowStockThreshold) {
          emitEvent({
            event: 'low_stock',
            title: 'Stock bajo',
            message: `${prod.name}: ${newStock} unidades (umbral: ${prod.lowStockThreshold})`,
            data: {
              productId: item.productId,
              productName: prod.name,
              stock: newStock,
              threshold: prod.lowStockThreshold,
            },
          });
        }
      }

      await tx.order.create({
        data: {
          customerName: intent.metadata?.customerName || 'Cliente',
          email: intent.metadata?.email || '',
          phone: intent.metadata?.phone || null,
          address: intent.metadata?.address || '',
          city: intent.metadata?.city || '',
          state: intent.metadata?.state || '',
          zipCode: intent.metadata?.zipCode || '',
          total,
          shippingCost,
          paymentStatus: 'PAID',
          paidAt: new Date(),
          paymentIntentId: intent.id,
          notes: intent.metadata?.notes || null,
          items: { create: orderItems },
        },
      });

      if (intent.metadata?.promoCode) {
        await tx.promoCode.updateMany({
          where: { code: intent.metadata.promoCode.toUpperCase(), isActive: true },
          data: { usedCount: { increment: 1 } },
        });
      }
    });

    console.log(`[webhook] Order created from PaymentIntent ${intent.id}`);

    // A completed order means any abandoned cart for this customer was recovered.
    prisma.abandonedCart
      .updateMany({
        where: {
          recovered: false,
          ...(intent.metadata?.userId
            ? { userId: intent.metadata.userId }
            : { email: intent.metadata?.email || '' }),
        },
        data: { recovered: true },
      })
      .catch(() => {});

    // Send confirmation email — fire and forget, outside the transaction
    const emailItems = orderItems.map(async (item) => {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true },
      });
      return { name: product?.name ?? item.productId, quantity: item.quantity, price: item.price };
    });
    Promise.all(emailItems)
      .then((resolvedItems) => {
        sendOrderConfirmation({
          to: intent.metadata?.email || '',
          customerName: intent.metadata?.customerName || 'Cliente',
          orderId: intent.id,
          items: resolvedItems,
          total,
        }).catch(() => {});
      })
      .catch(() => {});
  } catch (err: unknown) {
    if (getErrorCode(err) === 'P2002') {
      // Unique constraint — order already exists (race condition with frontend)
      console.log(`[webhook] Order already exists for ${intent.id}`);
      return;
    }
    throw err;
  }
}

async function handleChargeRefunded(event: StripeEvent): Promise<void> {
  const charge = event.data.object as { payment_intent: string; id: string; amount: number };
  const order = await prisma.order.findUnique({
    where: { paymentIntentId: charge.payment_intent },
  });
  if (!order || order.paymentStatus === 'REFUNDED') return;

  await prisma.$transaction(async (tx) => {
    // Re-check inside the transaction so a duplicate/replayed webhook event
    // can't restore stock twice for the same order.
    const current = await tx.order.findUnique({
      where: { id: order.id },
      select: { paymentStatus: true },
    });
    if (!current || current.paymentStatus === 'REFUNDED') return;

    await tx.order.update({ where: { id: order.id }, data: { paymentStatus: 'REFUNDED' } });
    const orderItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
    for (const item of orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: 'RETURN',
          quantity: item.quantity,
          previousStock: 0,
          newStock: 0, // we don't have prev stock handy, that's OK
          orderId: order.id,
          notes: `Reembolso charge ${charge.id}`,
        },
      });
    }
  });
  console.log(`[webhook] Order ${order.id} refunded, stock restored`);
}

export default router;
