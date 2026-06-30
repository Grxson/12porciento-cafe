import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendOrderConfirmation, sendOrderStatusUpdate } from '../email';
import { emitEvent } from '../socket';
import { getErrorMessage, getErrorCode } from '../lib/error-utils';

const router = Router();

const orderLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiados pedidos. Intenta en 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2026-05-27.dahlia',
});

function validateOrderFields(data: Record<string, unknown>): string | null {
  if (
    !data.customerName ||
    typeof data.customerName !== 'string' ||
    data.customerName.trim().length < 2 ||
    data.customerName.length > 100
  ) {
    return 'Nombre debe tener entre 2 y 100 caracteres';
  }
  if (
    !data.email ||
    typeof data.email !== 'string' ||
    data.email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)
  ) {
    return 'Email inválido';
  }
  if (data.phone && !/^\d{10}$/.test(String(data.phone).replace(/[\s\-()]/g, ''))) {
    return 'Teléfono debe tener 10 dígitos';
  }
  if (
    !data.address ||
    typeof data.address !== 'string' ||
    data.address.trim().length < 5 ||
    data.address.length > 200
  ) {
    return 'Dirección debe tener entre 5 y 200 caracteres';
  }
  if (
    !data.city ||
    typeof data.city !== 'string' ||
    data.city.trim().length < 2 ||
    data.city.length > 100
  ) {
    return 'Ciudad inválida';
  }
  if (
    !data.state ||
    typeof data.state !== 'string' ||
    data.state.trim().length < 2 ||
    data.state.length > 100
  ) {
    return 'Estado inválido';
  }
  if (!data.zipCode || !/^\d{5}$/.test(String(data.zipCode))) {
    return 'CP debe tener 5 dígitos';
  }
  if (data.notes && typeof data.notes === 'string' && data.notes.length > 500) {
    return 'Notas no pueden superar 500 caracteres';
  }
  return null;
}

async function applyPromo(
  subtotal: number,
  promoCode?: string,
): Promise<{ total: number; promoId: string | null }> {
  if (!promoCode) return { total: subtotal, promoId: null };
  const promo = await prisma.promoCode.findUnique({ where: { code: promoCode.toUpperCase() } });
  if (!promo || !promo.isActive) return { total: subtotal, promoId: null };
  if (promo.expiresAt && new Date() > promo.expiresAt) return { total: subtotal, promoId: null };
  if (promo.maxUses && promo.usedCount >= promo.maxUses) return { total: subtotal, promoId: null };
  // Treat anything that isn't an explicit FIXED amount as a percentage. Historic rows
  // and the admin form have used both 'PERCENT' and 'PERCENTAGE' for percentage promos.
  const isFixed = promo.type === 'FIXED';
  const discount = isFixed ? Math.min(promo.discount, subtotal) : subtotal * (promo.discount / 100);
  return { total: Math.max(subtotal - discount, 0), promoId: promo.id };
}

router.post('/', orderLimiter, async (req: Request, res: Response) => {
  try {
    const {
      items: clientItems,
      paymentIntentId,
      promoCode,
      customerName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      notes,
    } = req.body;

    if (!paymentIntentId) {
      return res.status(400).json({ error: 'Payment intent requerido' });
    }

    const orderData = { customerName, email, phone, address, city, state, zipCode, notes };

    const validationError = validateOrderFields(orderData);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(authHeader.replace('Bearer ', ''), process.env.JWT_SECRET!) as {
          id: string;
          role?: string;
        };
        if (payload.role === 'USER') userId = payload.id;
      } catch {
        /* invalid token */
      }
    }

    let intent: Awaited<ReturnType<typeof stripe.paymentIntents.retrieve>>;
    try {
      intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== 'succeeded') {
        return res.status(400).json({ error: 'El pago no ha sido confirmado.' });
      }
    } catch {
      return res.status(400).json({ error: 'No se pudo verificar el pago.' });
    }

    let intentItems: { productId: string; quantity: number }[];
    try {
      intentItems = JSON.parse(intent.metadata?.items || '[]');
    } catch {
      return res.status(500).json({ error: 'Error al leer metadata del pago.' });
    }
    if (!intentItems?.length) {
      return res.status(500).json({ error: 'Metadata de pago corrupta.' });
    }

    const MAX_QTY_PER_PRODUCT = 10;
    if (
      clientItems?.some(
        (item: { productId: string; quantity: number }) =>
          !item.productId ||
          !Number.isInteger(item.quantity) ||
          item.quantity < 1 ||
          item.quantity > MAX_QTY_PER_PRODUCT,
      )
    ) {
      return res
        .status(400)
        .json({ error: `Cantidad máxima por producto: ${MAX_QTY_PER_PRODUCT}` });
    }

    const existing = await prisma.order.findUnique({
      where: { paymentIntentId },
      include: { items: { include: { product: true } } },
    });
    if (existing) return res.json(existing);

    const subtotal = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      let total = 0;
      for (const item of intentItems) {
        const prod = await tx.product.findUnique({
          where: { id: item.productId },
          select: { price: true, stock: true, isActive: true, name: true },
        });
        if (!prod || !prod.isActive) {
          throw new Error(`VALIDATION:Producto no disponible`);
        }
        if (prod.stock < item.quantity) {
          console.error('[orders] Stock fail (subtotal tx):', {
            productName: prod.name,
            stock: prod.stock,
            quantity: item.quantity,
            stockType: typeof prod.stock,
            qtyType: typeof item.quantity,
            pid: item.productId,
          });
          throw new Error(
            `VALIDATION:Stock insuficiente para "${prod.name}" (disponible: ${prod.stock})`,
          );
        }
        total += Number(prod.price) * item.quantity;
      }
      return total;
    });

    const intentAmountMatch = Math.abs(Math.round(subtotal * 100) - intent.amount) < 100;
    if (!intentAmountMatch) {
      return res.status(400).json({
        error: 'El monto del pago no coincide con los productos ordenados.',
        detail: `Total calculado: $${(subtotal / 100).toFixed(2)}, Cargo: $${(intent.amount / 100).toFixed(2)}`,
      });
    }

    const { total, promoId } = await applyPromo(subtotal, promoCode);
    const expectedAmount = Math.round(total * 100);
    if (Math.abs(expectedAmount - intent.amount) >= 50) {
      return res.status(400).json({
        error: 'El descuento no se aplicó correctamente.',
        detail: `Total con descuento: $${(total / 100).toFixed(2)}, Cargo: $${(intent.amount / 100).toFixed(2)}`,
      });
    }

    try {
      const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Validate stock and collect prices
        const priceMap: Record<string, number> = {};
        for (const item of intentItems) {
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
            select: { price: true, stock: true, isActive: true, name: true },
          });
          if (!prod || !prod.isActive) throw new Error(`VALIDATION:Producto no disponible`);
          if (prod.stock < item.quantity)
            throw new Error(
              `VALIDATION:Stock insuficiente para "${prod.name}" (disponible: ${prod.stock})`,
            );
          priceMap[item.productId] = Number(prod.price);
        }

        const created = await tx.order.create({
          data: {
            ...orderData,
            total,
            ...(userId ? { userId } : {}),
            paymentIntentId,
            items: {
              create: intentItems.map((item) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: priceMap[item.productId],
              })),
            },
          },
          include: { items: { include: { product: true } } },
        });

        for (const item of intentItems) {
          const updated = await tx.product.updateMany({
            where: { id: item.productId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (updated.count === 0) {
            const prod = await tx.product.findUnique({
              where: { id: item.productId },
              select: { name: true, stock: true },
            });
            throw new Error(
              `VALIDATION:Stock insuficiente para "${prod?.name || 'Producto'}" (disponible: ${prod?.stock ?? 0})`,
            );
          }
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true, price: true, name: true, lowStockThreshold: true },
          });
          if (prod) {
            const newStock = prod.stock;
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'SALE',
                quantity: -item.quantity,
                previousStock: prod.stock + item.quantity,
                newStock,
                orderId: created.id,
                notes: `Pedido #${created.id.slice(-8).toUpperCase()}`,
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
        }

        if (promoId)
          await tx.promoCode.update({
            where: { id: promoId },
            data: { usedCount: { increment: 1 } },
          });

        return created;
      });

      sendOrderConfirmation({
        to: order.email,
        customerName: order.customerName,
        orderId: order.id,
        items: order.items.map(
          (i: { product: { name: string }; quantity: number; price: number }) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.price,
          }),
        ),
        total: order.total,
      }).catch(() => {});

      emitEvent({
        event: 'new_order',
        title: 'Nuevo pedido',
        message: `Pedido de ${order.customerName} — $${order.total.toFixed(2)} MXN`,
        data: { orderId: order.id, total: order.total, customerName: order.customerName },
      });

      res.status(201).json(order);
    } catch (err: unknown) {
      const code = getErrorCode(err);
      if (code === 'P2002' && paymentIntentId) {
        const existing = await prisma.order.findUnique({
          where: { paymentIntentId },
          include: { items: { include: { product: true } } },
        });
        if (existing) return res.json(existing);
      }
      const msg = getErrorMessage(err);
      if (msg.startsWith('VALIDATION:')) {
        return res.status(400).json({ error: msg.replace('VALIDATION:', '') });
      }
      throw err;
    }
  } catch (err: unknown) {
    res.status(500).json({ error: getErrorMessage(err, 'Error al crear pedido') });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status, search, dateFrom, dateTo, page, pageSize } = req.query;
    const where: Prisma.OrderWhereInput = {};

    if (status) where.status = status as string;

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

    const psRaw = parseInt(pageSize as string);
    const ps = Number.isInteger(psRaw) ? Math.min(Math.max(psRaw, 1), 200) : 50;
    const pgRaw = parseInt(page as string);
    const pg = Number.isInteger(pgRaw) ? Math.max(pgRaw - 1, 0) : 0;

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

    res.json({
      data: orders,
      total,
      page: pg + 1,
      pageSize: ps,
      totalPages: Math.ceil(total / ps),
    });
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
    if (!order) {
      res.status(404).json({ error: 'Pedido no encontrado' });
      return;
    }
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

    if (status === 'CANCELLED') {
      const orderWithItems = await prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: { include: { product: true } } },
      });
      if (!orderWithItems) {
        res.status(404).json({ error: 'Pedido no encontrado' });
        return;
      }
      if (orderWithItems.status === 'CANCELLED') {
        res.status(400).json({ error: 'El pedido ya está cancelado' });
        return;
      }

      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const item of orderWithItems.items) {
          const prod = await tx.product.findUnique({
            where: { id: item.productId },
            select: { stock: true },
          });
          if (prod) {
            await tx.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.quantity } },
            });
            await tx.stockMovement.create({
              data: {
                productId: item.productId,
                type: 'RETURN',
                quantity: item.quantity,
                previousStock: prod.stock,
                newStock: prod.stock + item.quantity,
                orderId: orderWithItems.id,
                notes: `Cancelación pedido #${orderWithItems.id.slice(-8).toUpperCase()}`,
              },
            });
          }
        }
        await tx.order.update({ where: { id: req.params.id }, data: { status } });
      });
    } else {
      await prisma.order.update({ where: { id: req.params.id }, data: { status } });
    }

    const order = await prisma.order.findUnique({ where: { id: req.params.id } });

    if (order && ['PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      sendOrderStatusUpdate({
        to: order.email,
        customerName: order.customerName,
        orderId: order.id,
        status,
      }).catch(() => {});

      emitEvent({
        event: 'order_status_changed',
        title: `Pedido #${order.id.slice(-8).toUpperCase()} — ${status}`,
        message: `Tu pedido ha sido actualizado a: ${status}`,
        targetUserId: order.userId ?? undefined,
        data: { orderId: order.id, status, customerName: order.customerName },
      });
    }

    res.json(order);
  } catch {
    res.status(500).json({ error: 'Error al actualizar pedido' });
  }
});

export default router;
