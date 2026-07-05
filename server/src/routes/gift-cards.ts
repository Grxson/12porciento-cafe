import { Router, Response } from 'express';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { sendMail } from '../lib/mail';
import crypto from 'crypto';

const router = Router();

function generateCode(): string {
  return 'GIFT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

// POST /purchase — confirm gift card purchase after Stripe payment
router.post('/purchase', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const {
      amount,
      recipientName,
      recipientEmail,
      senderName,
      message,
      paymentIntentId: _paymentIntentId,
    } = req.body;

    if (!amount || amount < 50 || amount > 5000) {
      return res.status(400).json({ error: 'El monto debe ser entre $50 y $5,000' });
    }
    if (!recipientEmail) {
      return res.status(400).json({ error: 'Email del destinatario requerido' });
    }

    const code = generateCode();
    const giftCard = await prisma.giftCard.create({
      data: {
        code,
        initialAmount: amount,
        balance: amount,
        senderId: req.user!.id,
        senderName: senderName || req.user!.name,
        recipientName,
        recipientEmail: recipientEmail.toLowerCase(),
        message,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });

    // Send email to recipient
    const expDate = giftCard.expiresAt?.toLocaleDateString('es-MX');
    const emailHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>🎁 Has recibido una Gift Card de 12% Café</h2>
        <p><strong>${senderName || 'Alguien especial'}</strong> te ha regalado una tarjeta de regalo por <strong>$${amount} MXN</strong>.</p>
        ${message ? `<p><em>"${message}"</em></p>` : ''}
        <p>Usa tu código: <strong style="font-size: 1.2em; color: #B8860B;">${code}</strong></p>
        <p>Para canjearla, ingresa el código al momento de pagar en nuestra tienda.</p>
        <hr />
        <p style="color: #666;">Este código expira el ${expDate}</p>
      </div>
    `;
    await sendMail({
      to: recipientEmail,
      subject: '🎁 Recibiste una Gift Card de 12% Café',
      html: emailHtml,
    });

    res.status(201).json({ data: giftCard });
  } catch (error) {
    console.error('[gift-cards] Purchase error:', error);
    res.status(500).json({ error: 'Error al comprar gift card' });
  }
});

// GET /my — list user's gift cards (sent + received)
router.get('/my', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const [sent, received] = await Promise.all([
      prisma.giftCard.findMany({
        where: { senderId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.giftCard.findMany({
        where: { recipientId: req.user!.id },
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    res.json({ data: { sent, received } });
  } catch {
    res.status(500).json({ error: 'Error al obtener gift cards' });
  }
});

// POST /redeem — link gift card to current user
router.post('/redeem', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Código requerido' });

    const giftCard = await prisma.giftCard.findUnique({ where: { code: code.toUpperCase() } });
    if (!giftCard) return res.status(404).json({ error: 'Código inválido' });
    if (!giftCard.isActive)
      return res.status(400).json({ error: 'Esta tarjeta ya no está activa' });
    if (giftCard.balance <= 0)
      return res.status(400).json({ error: 'Esta tarjeta no tiene saldo' });
    if (giftCard.expiresAt && new Date() > giftCard.expiresAt) {
      return res.status(400).json({ error: 'Esta tarjeta ha expirado' });
    }

    if (!giftCard.recipientId) {
      await prisma.giftCard.update({
        where: { id: giftCard.id },
        data: { recipientId: req.user!.id },
      });
    }

    res.json({ data: { code: giftCard.code, balance: giftCard.balance } });
  } catch {
    res.status(500).json({ error: 'Error al canjear gift card' });
  }
});

// Admin: GET / — list all gift cards with pagination
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 20));
    const skip = (page - 1) * pageSize;
    const search = (req.query.search as string) || '';

    const where = search
      ? {
          OR: [
            { code: { contains: search, mode: 'insensitive' as const } },
            { recipientName: { contains: search, mode: 'insensitive' as const } },
            { recipientEmail: { contains: search, mode: 'insensitive' as const } },
            { senderName: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {};

    const [cards, total] = await Promise.all([
      prisma.giftCard.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.giftCard.count({ where }),
    ]);

    res.json({
      data: cards,
      total,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch {
    res.status(500).json({ error: 'Error al listar gift cards' });
  }
});

// Admin: PATCH /:id/toggle — activate/deactivate
router.patch('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const card = await prisma.giftCard.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive },
    });
    res.json({ data: card });
  } catch {
    res.status(500).json({ error: 'Error al actualizar gift card' });
  }
});

export default router;
