import express from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
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
  };

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
    } catch { /* guest checkout */ }
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items requeridos' });
  }
  const MAX_QTY_PER_PRODUCT = 10;
  if (items.some((i) => !i.productId || !Number.isInteger(i.quantity) || i.quantity < 1 || i.quantity > MAX_QTY_PER_PRODUCT)) {
    return res.status(400).json({ error: `Cantidad máxima por producto: ${MAX_QTY_PER_PRODUCT}` });
  }

  let amount: number;

  try {
    amount = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let totalAmount = 0;
      for (const item of items) {
        // Atomic check: only succeeds if stock >= quantity
        const updated = await tx.product.updateMany({
          where: { id: item.productId, stock: { gte: item.quantity } },
          data: {},  // no change, just atomic check
        });
        if (updated.count === 0) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { name: true, stock: true },
          });
          throw new Error(`Stock insuficiente para "${product?.name || 'Producto'}" (disponible: ${product?.stock ?? 0})`);
        }
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { price: true, stock: true, isActive: true, name: true },
        });
        if (!product || !product.isActive) {
          throw new Error(`Producto ${item.productId} no disponible`);
        }
        totalAmount += product.price * item.quantity;
      }
      return totalAmount;
    });
  } catch (error: unknown) {
    return res.status(400).json({ error: error instanceof Error ? error.message : 'Error al verificar stock' });
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
    const rawIdempotencyKey = (req.headers['idempotency-key'] as string)?.trim();
    if (!rawIdempotencyKey || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(rawIdempotencyKey)) {
      return res.status(400).json({ error: 'idempotency-key header required and must be valid UUID' });
    }
    const idempotencyKey = rawIdempotencyKey;

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
  } catch (error: unknown) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: 'Error al crear intento de pago' });
  }
});

// POST /create-gift-intent — create PaymentIntent for gift card purchase
router.post('/create-gift-intent', paymentLimiter, async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || amount < 50 || amount > 5000) {
      return res.status(400).json({ error: 'El monto debe ser entre $50 y $5,000' });
    }
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: { type: 'gift_card' },
    });
    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error: unknown) {
    console.error('Stripe gift intent error:', error);
    res.status(500).json({ error: 'Error al crear intento de pago' });
  }
});

export default router;
