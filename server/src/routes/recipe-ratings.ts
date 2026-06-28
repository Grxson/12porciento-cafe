import { Router, Response } from 'express';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';

const router = Router();

// GET /:recipeId — get ratings for a recipe (public)
router.get('/:recipeId', async (req, res: Response) => {
  try {
    const ratings = await prisma.recipeRating.findMany({
      where: { recipeId: req.params.recipeId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    const avg = ratings.length
      ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length
      : 0;
    res.json({ data: ratings, average: Math.round(avg * 10) / 10, count: ratings.length });
  } catch {
    res.status(500).json({ error: 'Error al obtener valoraciones' });
  }
});

// POST /:recipeId — add/update rating (auth required)
router.post('/:recipeId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'La valoración debe ser entre 1 y 5' });
    }
    const existing = await prisma.recipeRating.findUnique({
      where: { recipeId_userId: { recipeId: req.params.recipeId, userId: req.user!.id } },
    });
    if (existing) {
      const updated = await prisma.recipeRating.update({
        where: { id: existing.id },
        data: { rating, comment },
      });
      return res.json({ data: updated });
    }
    const created = await prisma.recipeRating.create({
      data: { recipeId: req.params.recipeId, userId: req.user!.id, rating, comment },
    });
    res.status(201).json({ data: created });
  } catch {
    res.status(500).json({ error: 'Error al valorar receta' });
  }
});

// DELETE /:recipeId — remove rating
router.delete('/:recipeId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    await prisma.recipeRating.deleteMany({
      where: { recipeId: req.params.recipeId, userId: req.user!.id },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar valoración' });
  }
});

export default router;
