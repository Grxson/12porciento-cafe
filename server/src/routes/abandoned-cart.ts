import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendMail } from '../lib/mail';

const router = Router();

// POST /track — track abandoned cart (called from client when user leaves checkout)
router.post('/track', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { items, email, couponCode } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: 'Carrito vacío' });
      return;
    }
    if (!email) {
      res.status(400).json({ error: 'Email requerido' });
      return;
    }

    // Upsert: update existing active cart or create new
    const existing = await prisma.abandonedCart.findFirst({
      where: { userId: req.user!.id, recovered: false },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const updated = await prisma.abandonedCart.update({
        where: { id: existing.id },
        data: { items: JSON.stringify(items), email, couponCode: couponCode || null },
      });
      res.json({ data: updated });
      return;
    }

    const cart = await prisma.abandonedCart.create({
      data: {
        userId: req.user!.id,
        email,
        items: JSON.stringify(items),
        couponCode: couponCode || null,
      },
    });
    res.status(201).json({ data: cart });
  } catch (error) {
    console.error('[abandoned-cart] Track error:', error);
    res.status(500).json({ error: 'Error al registrar carrito abandonado' });
  }
});

// POST /send-reminder — send reminder email (called by cron or admin)
router.post('/send-reminder', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.body;
    const cart = await prisma.abandonedCart.findUnique({ where: { id } });
    if (!cart) {
      res.status(404).json({ error: 'Carrito no encontrado' });
      return;
    }
    if (cart.recovered) {
      res.status(400).json({ error: 'Carrito ya recuperado' });
      return;
    }

    const items = JSON.parse(cart.items) as { productId: string; name?: string; quantity: number; price?: number }[];
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🛒 ¡Tu carrito te espera!</h2>
        <p>Notamos que dejaste algunos productos en tu carrito:</p>
        <ul>${items.map(i => `<li>${i.name || 'Producto'} x${i.quantity}${i.price ? ` — $${i.price}` : ''}</li>`).join('')}</ul>
        ${cart.couponCode ? `<p>🔑 Tu código <strong>${cart.couponCode}</strong> sigue activo.</p>` : ''}
        <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/checkout" 
           style="display: inline-block; padding: 12px 24px; background: #B8860B; color: white; text-decoration: none; border-radius: 8px;">
          Completar mi compra
        </a>
      </div>
    `;

    const sent = await sendMail({ to: cart.email, subject: '🛒 ¡Tu carrito de 12% Café te espera!', html: emailHtml });

    if (sent) {
      await prisma.abandonedCart.update({
        where: { id },
        data: { reminderSentAt: new Date(), reminderCount: { increment: 1 } },
      });
    }

    res.json({ success: sent });
  } catch (error) {
    console.error('[abandoned-cart] Send reminder error:', error);
    res.status(500).json({ error: 'Error al enviar recordatorio' });
  }
});

// PATCH /:id/recover — mark cart as recovered
router.patch('/:id/recover', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const updated = await prisma.abandonedCart.update({
      where: { id: req.params.id },
      data: { recovered: true },
    });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Error al marcar como recuperado' });
  }
});

// GET / — list all abandoned carts (admin) with optional email/date/recovered filters
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = 20;
    const email = (req.query.email as string) || '';
    const from = (req.query.from as string) || '';
    const to = (req.query.to as string) || '';
    const recovered = req.query.recovered as string;

    const where: Prisma.AbandonedCartWhereInput = {};
    if (email) where.email = { contains: email.toLowerCase(), mode: 'insensitive' };
    if (from || to) {
      const createdAt: Prisma.DateTimeFilter = {};
      if (from) createdAt.gte = new Date(from);
      if (to) createdAt.lte = new Date(to + 'T23:59:59');
      where.createdAt = createdAt;
    }
    if (recovered !== undefined) where.recovered = recovered === '1';

    const [carts, total] = await Promise.all([
      prisma.abandonedCart.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.abandonedCart.count({ where }),
    ]);
    res.json({ data: carts, total, page, totalPages: Math.ceil(total / limit) });
  } catch {
    res.status(500).json({ error: 'Error al listar carritos abandonados' });
  }
});

export default router;
