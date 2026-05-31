import express from 'express';
import Stripe from 'stripe';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

router.post('/create-intent', async (req, res) => {
  const { items } = req.body as { items: { productId: string; quantity: number }[] };

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items requeridos' });
  }

  try {
    let amount = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { price: true, stock: true, isActive: true },
      });

      if (!product || !product.isActive) {
        return res.status(404).json({ error: `Producto ${item.productId} no encontrado` });
      }

      if (product.stock < item.quantity) {
        return res.status(400).json({ error: `Stock insuficiente para producto ${item.productId}` });
      }

      amount += product.price * item.quantity;
    }

    // Stripe uses smallest currency unit (centavos for MXN)
    const amountCentavos = Math.round(amount * 100);

    if (amountCentavos < 1000) {
      return res.status(400).json({ error: 'El monto mínimo es $10 MXN' });
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCentavos,
      currency: 'mxn',
      automatic_payment_methods: { enabled: true },
      metadata: {
        items: JSON.stringify(items.map((i) => ({ productId: i.productId, quantity: i.quantity }))),
      },
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      amount,
    });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return res.status(500).json({ error: 'Error al crear intento de pago' });
  }
});

export default router;
