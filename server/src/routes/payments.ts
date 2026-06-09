import express from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { prisma } from '../db';

const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados intentos. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

async function applyPromo(subtotal: number, promoCode?: string): Promise<{ finalAmount: number; discountAmount: number }> {
  if (!promoCode) return { finalAmount: subtotal, discountAmount: 0 };
  const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } });
  if (!promo || !promo.isActive) return { finalAmount: subtotal, discountAmount: 0 };
  if (promo.expiresAt && new Date() > promo.expiresAt) return { finalAmount: subtotal, discountAmount: 0 };
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return { finalAmount: subtotal, discountAmount: 0 };
  // Any non-FIXED type is a percentage (schema/admin form historically used both
  // 'PERCENT' and 'PERCENTAGE'; only 'FIXED' is a flat amount).
  const discount = promo.type === 'FIXED'
    ? Math.min(promo.discount, subtotal)
    : subtotal * (promo.discount / 100);
  return { finalAmount: Math.max(subtotal - discount, 0), discountAmount: discount };
}

router.post('/create-intent', paymentLimiter, async (req, res) => {
  const {
    items,
    promoCode,
    stripeCustomerId,
    paymentMethodId,
    customerName,
    email,
    phone,
    address,
    city,
    state,
    zipCode,
    notes,
    userId,
  } = req.body as {
    items: { productId: string; quantity: number }[];
    promoCode?: string;
    stripeCustomerId?: string;
    paymentMethodId?: string;
    customerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    notes?: string;
    userId?: string;
  };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items requeridos' });
  }

  let amount: number;

  try {
    amount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let totalAmount = 0;
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { price: true, stock: true, isActive: true, name: true },
        });
        if (!product || !product.isActive) {
          throw new Error(`Producto ${item.productId} no disponible`);
        }
        if (product.stock < item.quantity) {
          throw new Error(`Stock insuficiente para "${product.name}"`);
        }
        totalAmount += product.price * item.quantity;
      }
      return totalAmount;
    });
  } catch (error: any) {
    return res.status(400).json({ error: error.message || 'Error al verificar stock' });
  }

  try {
    const { finalAmount, discountAmount } = await applyPromo(amount, promoCode);
    const amountCentavos = Math.round(finalAmount * 100);

    if (amountCentavos < 1000) {
      return res.status(400).json({ error: 'El monto mínimo es $10 MXN' });
    }

    if (paymentMethodId && !stripeCustomerId) {
      return res.status(400).json({ error: 'Tu método de pago guardado requiere información de cliente. Intenta actualizar tu perfil o usar un método de pago nuevo.' });
    }

    const s = (v?: string) => (v ? v.slice(0, 500) : undefined);
    const idempotencyKey = (req.headers['idempotency-key'] as string) || randomUUID();

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCentavos,
      currency: 'mxn',
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
      ...(paymentMethodId
        ? { payment_method: paymentMethodId }
        : { automatic_payment_methods: { enabled: true } }),
      metadata: {
        items: JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity }))),
        ...(promoCode ? { promoCode } : {}),
        ...(s(customerName) ? { customerName: s(customerName)! } : {}),
        ...(s(email) ? { email: s(email)! } : {}),
        ...(s(phone) ? { phone: s(phone)! } : {}),
        ...(s(address) ? { address: s(address)! } : {}),
        ...(s(city) ? { city: s(city)! } : {}),
        ...(s(state) ? { state: s(state)! } : {}),
        ...(s(zipCode) ? { zipCode: s(zipCode)! } : {}),
        ...(s(notes) ? { notes: s(notes)! } : {}),
        ...(s(userId) ? { userId: s(userId)! } : {}),
      },
    }, { idempotencyKey });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: finalAmount,
      subtotal: amount,
      discountAmount,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: 'Error al crear intento de pago' });
  }
});

export default router;
