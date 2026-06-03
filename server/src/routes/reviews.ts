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
    const { name, email, rating, comment } = req.body;
    if (!name || !email || !rating || !comment) {
      return res.status(400).json({ error: 'Todos los campos son requeridos' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating debe ser entre 1 y 5' });
    }
    const review = await prisma.review.create({
      data: { productId: req.params.productId, name, email, rating: parseInt(rating), comment },
    });
    res.status(201).json({ data: review, message: 'Reseña enviada, pendiente de aprobación' });
  } catch {
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

export default router;
