import { Router, Response } from 'express';
import { prisma } from '../db';
import { requireUserAuth } from '../middleware/userAuth';
import type { UserAuthRequest } from '../middleware/userAuth';

const router = Router();

router.get('/', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const favorites = await prisma.recipeFavorite.findMany({
      where: { userId: req.user!.id },
      select: { recipeId: true },
    });
    res.json({ data: favorites });
  } catch {
    res.status(500).json({ error: 'Error al cargar favoritos' });
  }
});

router.post('/:recipeId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const existing = await prisma.recipeFavorite.findUnique({
      where: { userId_recipeId: { userId: req.user!.id, recipeId: req.params.recipeId } },
    });
    if (existing) {
      res.status(409).json({ error: 'Ya está en favoritos' });
      return;
    }
    const favorite = await prisma.recipeFavorite.create({
      data: { userId: req.user!.id, recipeId: req.params.recipeId },
    });
    res.status(201).json({ data: favorite });
  } catch {
    res.status(500).json({ error: 'Error al agregar favorito' });
  }
});

router.delete('/:recipeId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    await prisma.recipeFavorite.deleteMany({
      where: { userId: req.user!.id, recipeId: req.params.recipeId },
    });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

export default router;
