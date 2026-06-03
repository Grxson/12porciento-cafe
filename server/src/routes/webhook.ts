import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { prisma } from '../db';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

router.post('/', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('[webhook] STRIPE_WEBHOOK_SECRET not set — skipping signature verification');
    res.json({ received: true });
    return;
  }

  let event: ReturnType<typeof stripe.webhooks.constructEvent>;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig as string, webhookSecret);
  } catch (err: any) {
    console.error('[webhook] Signature verification failed:', err.message);
    res.status(400).json({ error: `Webhook error: ${err.message}` });
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

    // Parse items from metadata (set during create-intent)
    let items: { productId: string; quantity: number }[] = [];
    try {
      items = JSON.parse(intent.metadata?.items || '[]');
    } catch {
      console.error('[webhook] Could not parse items from PaymentIntent metadata', intent.id);
      res.json({ received: true, status: 'metadata_parse_error' });
      return;
    }

    if (items.length === 0) {
      res.json({ received: true, status: 'no_items' });
      return;
    }

    // Fetch current prices
    const orderItems: { productId: string; quantity: number; price: number }[] = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { price: true },
      });
      if (product) {
        orderItems.push({ productId: item.productId, quantity: item.quantity, price: product.price });
      }
    }

    // Amount from Stripe is authoritative (already includes discount)
    const total = intent.amount / 100;

    try {
      await prisma.order.create({
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
          items: {
            create: orderItems,
          },
        },
      });

      // Decrement stock
      for (const item of orderItems) {
        await prisma.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        }).catch(() => {});
      }

      console.log(`[webhook] Order created from PaymentIntent ${intent.id}`);
    } catch (err: any) {
      if (err.code === 'P2002') {
        // Unique constraint — order already exists (race condition with frontend)
        console.log(`[webhook] Order already exists for ${intent.id}`);
      } else {
        console.error('[webhook] Failed to create order:', err);
        res.status(500).json({ error: 'Failed to create order' });
        return;
      }
    }
  }

  res.json({ received: true });
});

export default router;
