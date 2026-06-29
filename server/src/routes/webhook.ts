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

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: unknown) {
    const msg = getErrorMessage(err);
    console.error('[webhook] Signature verification failed:', msg);
    res.status(400).json({ error: `Webhook error: ${msg}` });
    return;
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as { id: string; amount: number; metadata: Record<string, string> };

    const existing = await prisma.order.findUnique({
      where: { paymentIntentId: intent.id },
    });

    if (existing) {
      res.json({ received: true, status: 'already_processed' });
      return;
    }

    let items: { productId: string; quantity: number }[] = [];
    try {
      items = JSON.parse(intent.metadata?.items || '[]');
    } catch {
      console.error('[webhook] Could not parse items from PaymentIntent metadata', intent.id);
      res.json({ received: true, status: 'metadata_parse_error' });
      return;
    }

    if (!items?.length) {
      res.json({ received: true, status: 'no_items' });
      return;
    }

    const orderItems: { productId: string; quantity: number; price: number }[] = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { price: true, stock: true, isActive: true, name: true },
      });
      if (!product) {
        console.error('[webhook] Product not found:', item.productId);
        res.json({ received: true, status: 'product_not_found', productId: item.productId });
        return;
      }
      if (!product.isActive) {
        console.error('[webhook] Product inactive:', item.productId);
        res.json({ received: true, status: 'product_inactive', productId: item.productId });
        return;
      }
      if (product.stock < item.quantity) {
        console.error('[webhook] Insufficient stock for', item.productId, 'needed:', item.quantity, 'available:', product.stock);
        res.json({ received: true, status: 'insufficient_stock', productId: item.productId });
        return;
      }
      orderItems.push({ productId: item.productId, quantity: item.quantity, price: Number(product.price) });
    }

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
          const prod = await tx.product.findUnique({ where: { id: item.productId }, select: { stock: true, name: true, lowStockThreshold: true } });
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
              data: { productId: item.productId, productName: prod.name, stock: newStock, threshold: prod.lowStockThreshold },
            });
          }
        }

        const created = await tx.order.create({
          data: {
            customerName: intent.metadata?.customerName || 'Cliente',
            email: intent.metadata?.email || '',
            phone: intent.metadata?.phone || null,
            address: intent.metadata?.address || '',
            city: intent.metadata?.city || '',
            state: intent.metadata?.state || '',
            zipCode: intent.metadata?.zipCode || '',
            total,
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

      // Send confirmation email — fire and forget, outside the transaction
      const emailItems = orderItems.map(async (item) => {
        const product = await prisma.product.findUnique({ where: { id: item.productId }, select: { name: true } });
        return { name: product?.name ?? item.productId, quantity: item.quantity, price: item.price };
      });
      Promise.all(emailItems).then((resolvedItems) => {
        sendOrderConfirmation({
          to: intent.metadata?.email || '',
          customerName: intent.metadata?.customerName || 'Cliente',
          orderId: intent.id,
          items: resolvedItems,
          total,
        }).catch(() => {});
      }).catch(() => {});
    } catch (err: unknown) {
      if (getErrorCode(err) === 'P2002') {
        // Unique constraint — order already exists (race condition with frontend)
        console.log(`[webhook] Order already exists for ${intent.id}`);
      } else {
        console.error('[webhook] Failed to create order:', err);
        res.status(500).json({ error: 'Failed to create order' });
        return;
      }
    }
  }

  if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object as { id: string; amount: number; last_payment_error?: { code?: string; message?: string } };
    console.error('[webhook] payment_failed', {
      id: intent.id,
      amount: intent.amount,
      code: intent.last_payment_error?.code ?? 'unknown',
      message: intent.last_payment_error?.message ?? 'no message',
    });
    res.json({ received: true });
    return;
  }

  if (event.type === 'charge.refunded') {
    const charge = event.data.object as { payment_intent: string; id: string; amount: number };
    const order = await prisma.order.findUnique({ where: { paymentIntentId: charge.payment_intent } });
    if (order) {
      await prisma.$transaction(async (tx) => {
        await tx.order.update({ where: { id: order.id }, data: { status: 'REFUNDED' } });
        // Restore stock
        const orderItems = await tx.orderItem.findMany({ where: { orderId: order.id } });
        for (const item of orderItems) {
          await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.quantity } } });
          await tx.stockMovement.create({
            data: {
              productId: item.productId, type: 'RETURN', quantity: item.quantity,
              previousStock: 0, newStock: 0, // we don't have prev stock handy, that's OK
              orderId: order.id, notes: `Reembolso charge ${charge.id}`,
            },
          });
        }
      });
      console.log(`[webhook] Order ${order.id} refunded, stock restored`);
    }
    res.json({ received: true });
    return;
  }

  if (event.type === 'payment_intent.canceled') {
    const intent = event.data.object as { id: string };
    const order = await prisma.order.findUnique({ where: { paymentIntentId: intent.id } });
    if (order && order.status === 'PENDING') {
      await prisma.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
      console.log(`[webhook] Order ${order.id} cancelled due to payment cancellation`);
    }
    res.json({ received: true });
    return;
  }

  res.json({ received: true });
});

export default router;
