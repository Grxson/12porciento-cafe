import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

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

router.post('/product/:productId', async (req: Request, res: Response) => {
  try {
    const { name, email, rating, comment, userId } = req.body;
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (rating < 1 || rating > 5) {
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
        rating: parseInt(rating),
        comment,
        ...(userId ? { userId } : {}),
      },
    });

    res.status(201).json({ data: review, message: 'Reseña enviada, pendiente de aprobación' });
  } catch (err) {
    console.error('Review creation error:', err);
    res.status(500).json({ error: 'Error al crear reseña' });
  }
});

router.get('/admin/all', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({
      include: { product: { select: { name: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: reviews });
  } catch {
    res.status(500).json({ error: 'Error al obtener reseñas' });
  }
});

router.put('/:id/approve', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { isApproved: true },
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
router.post('/:reviewId/reply', async (req: Request, res: Response) => {
  try {
    const { name, content, userId } = req.body;

    if (!content?.trim()) {
      return res.status(400).json({ error: 'El contenido es requerido' });
    }
    if (!userId && !name?.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' });
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

// DELETE /reply/:replyId — admin only
router.delete('/reply/:replyId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.reviewReply.delete({ where: { id: req.params.replyId } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar respuesta' });
  }
});

export default router;
