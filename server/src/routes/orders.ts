import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendOrderConfirmation } from '../email';

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

async function applyPromo(subtotal: number, promoCode?: string): Promise<number> {
  if (!promoCode) return subtotal;
  const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } });
  if (!promo || !promo.isActive) return subtotal;
  const discount = promo.type === 'PERCENTAGE'
    ? subtotal * (promo.discount / 100)
    : Math.min(promo.discount, subtotal);
  return Math.max(subtotal - discount, 0);
}

router.post('/', async (req: Request, res: Response) => {
  try {
    const { items, userId, paymentIntentId, promoCode, ...orderData } = req.body;

    if (paymentIntentId) {
      try {
        const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
        if (intent.status !== 'succeeded') {
          return res.status(400).json({ error: 'El pago no ha sido confirmado.' });
        }
      } catch {
        return res.status(400).json({ error: 'No se pudo verificar el pago.' });
      }
    } else {
      console.warn('[orders] Order created without paymentIntentId — guest/legacy order');
    }

    const subtotal = items.reduce(
      (sum: number, item: { price: number; quantity: number }) =>
        sum + item.price * item.quantity,
      0,
    );
    const total = await applyPromo(subtotal, promoCode);

    const order = await prisma.order.create({
      data: {
        ...orderData,
        total,
        ...(userId ? { userId } : {}),
        ...(paymentIntentId ? { paymentIntentId } : {}),
        items: {
          create: items.map((item: { productId: string; quantity: number; price: number }) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    for (const item of items) {
      await prisma.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      });
    }

    sendOrderConfirmation({
      to: order.email,
      customerName: order.customerName,
      orderId: order.id,
      items: order.items.map((i: { product: { name: string }; quantity: number; price: number }) => ({
        name: i.product.name,
        quantity: i.quantity,
        price: i.price,
      })),
      total: order.total,
    }).catch(() => {});

    res.status(201).json(order);
  } catch {
    res.status(500).json({ error: 'Error al crear pedido' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, dateFrom, dateTo, page, pageSize } = req.query;
    const where: any = {};

    if (status) where.status = status;

    if (search) {
      where.OR = [
        { customerName: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) {
        const end = new Date(dateTo as string);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const ps = pageSize ? Math.min(parseInt(pageSize as string), 200) : 50;
    const pg = page ? Math.max(parseInt(page as string) - 1, 0) : 0;

    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where,
        include: { items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' },
        take: ps,
        skip: pg * ps,
      }),
      prisma.order.count({ where }),
    ]);

    res.json({ data: orders, total, page: pg + 1, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!order) { res.status(404).json({ error: 'Pedido no encontrado' }); return; }
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Error al obtener pedido' });
  }
});

router.put('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(order);
  } catch {
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

export default router;
