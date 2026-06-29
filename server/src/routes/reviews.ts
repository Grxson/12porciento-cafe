import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import jwt from 'jsonwebtoken';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { emitEvent } from '../socket';

const router = Router();

const reviewLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiadas reseñas. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const replyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Demasiadas respuestas. Intenta en 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/product/:productId', async (req: Request, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      where: { productId: req.params.productId, isApproved: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: reviews });
  } catch {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.post('/product/:productId', reviewLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, rating, comment } = req.body;
    // Extract userId from token — ignore body to prevent IDOR
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(
          authHeader.replace('Bearer ', ''),
          process.env.JWT_SECRET!,
        ) as { id: string; role?: string };
        if (payload.role === 'USER') userId = payload.id;
      } catch { /* anonymous review */ }
    }
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return res.status(400).json({ error: 'Nombre debe tener entre 2 y 100 caracteres' });
    }
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }
    if (typeof comment !== 'string' || comment.trim().length < 10 || comment.length > 1000) {
      return res.status(400).json({ error: 'Comentario debe tener entre 10 y 1000 caracteres' });
    }
    const ratingNum = parseInt(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
    }

    // Prevent duplicate submissions within 60 seconds from same email
    const recent = await prisma.review.findFirst({
      where: {
        productId: req.params.productId,
        email,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });
    if (recent) {
      return res.status(409).json({
        error: 'Ya enviaste una reseña recientemente. Espera un momento antes de intentarlo de nuevo.',
      });
    }

    const review = await prisma.review.create({
      data: {
        productId: req.params.productId,
        name,
        email,
        rating: ratingNum,
        comment,
        ...(userId ? { userId } : {}),
      },
    });

    emitEvent({
      event: 'new_review',
      title: 'Nueva reseña',
      message: `${review.name} dejó una reseña — ${review.rating}★`,
      data: { reviewId: review.id, productId: review.productId, rating: review.rating },
    });

    res.status(201).json({ data: review, message: 'Reseña enviada, pendiente de aprobación' });
  } catch (err) {
    console.error('Review creation error:', err);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

router.get('/admin/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const skip = (page - 1) * pageSize;
    const filterParam = req.query.filter as string;
    const where: any = {};
    if (filterParam === 'pending') where.isApproved = false;
    if (filterParam === 'approved') where.isApproved = true;
    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where,
        skip,
        take: pageSize,
        include: { product: { select: { name: true, slug: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.review.count({ where }),
    ]);
    res.json({ data: reviews, total, page, pageSize, totalPages: Math.ceil(total / pageSize) });
  } catch {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

// PUT /reply/:replyId/approve — admin only
router.put('/reply/:replyId/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const reply = await prisma.reviewReply.update({
      where: { id: req.params.replyId },
      data: { isApproved: true },
    });
    res.json({ data: reply });
  } catch {
    res.status(500).json({ error: 'Error al aprobar respuesta' });
  }
});

router.put('/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { isApproved: true },
    });
    emitEvent({
      event: 'review_approved',
      title: 'Reseña aprobada',
      message: 'Tu reseña ha sido aprobada y publicada',
      data: { reviewId: review.id },
      targetUserId: review.userId ?? undefined,
    });
    res.json({ data: review });
  } catch {
    res.status(500).json({ error: 'Error al aprobar reseña' });
  }
});

router.put('/:id/respond', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { adminResponse } = req.body;
    if (!adminResponse?.trim()) {
      res.status(400).json({ error: 'La respuesta no puede estar vacía' });
      return;
    }
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { adminResponse, respondedAt: new Date() },
    });
    res.json({ data: review });
  } catch {
    res.status(500).json({ error: 'Error al responder reseña' });
  }
});

// DELETE /reply/:replyId — admin only
router.delete('/reply/:replyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.reviewReply.delete({ where: { id: req.params.replyId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar respuesta' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.review.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar reseña' });
  }
});

// GET /:reviewId/replies
router.get('/:reviewId/replies', async (req: Request, res: Response) => {
  try {
    const replies = await prisma.reviewReply.findMany({
      where: { reviewId: req.params.reviewId, isApproved: true },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ data: replies });
  } catch {
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
});

// POST /:reviewId/reply
router.post('/:reviewId/reply', replyLimiter, async (req: Request, res: Response) => {
  try {
    const { name, content } = req.body;

    // Extract userId from auth token if present (don't trust body)
    let userId: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const payload = jwt.verify(
          authHeader.replace('Bearer ', ''),
          process.env.JWT_SECRET!
        ) as { id: string };
        userId = payload.id;
      } catch {
        // invalid token — proceed as guest
      }
    }

    if (!content?.trim() || content.length > 500) {
      return res.status(400).json({ error: 'Contenido requerido (máx 500 caracteres)' });
    }
    if (!userId && !name?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
    }
    if (!userId && name && name.length > 100) {
      return res.status(400).json({ error: 'Nombre demasiado largo' });
    }

    const review = await prisma.review.findUnique({ where: { id: req.params.reviewId } });
    if (!review) return res.status(404).json({ error: 'Reseña no encontrada' });
    if (!review.isApproved) return res.status(403).json({ error: 'No se puede responder a una reseña no aprobada' });

    let authorName = name?.trim() || 'Anónimo';
    if (userId) {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      if (user) authorName = user.name;
    }

    const reply = await prisma.reviewReply.create({
      data: {
        reviewId: req.params.reviewId,
        content: content.trim(),
        name: authorName,
        ...(userId ? { userId } : {}),
      },
      include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    });

    res.status(201).json({
      data: reply,
      message: 'Respuesta enviada, pendiente de aprobación',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear respuesta' });
  }
});

export default router;
