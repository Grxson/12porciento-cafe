import { Router, Response } from 'express';
import { requireUserAuth, UserAuthRequest } from '../middleware/userAuth';
import { prisma } from '../db';

const router = Router();

// GET / — list user's wishlist items with product details
router.get('/', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const items = await prisma.wishlistItem.findMany({
      where: { userId: req.user!.id },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: items });
  } catch {
    res.status(500).json({ error: 'Error al obtener lista de deseos' });
  }
});

// POST / — add item to wishlist
router.post('/', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const { productId } = req.body;
    const existing = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId } },
    });
    if (existing) return res.status(409).json({ error: 'Ya está en tu lista de deseos' });
    const item = await prisma.wishlistItem.create({
      data: { userId: req.user!.id, productId },
      include: { product: true },
    });
    res.status(201).json({ data: item });
  } catch {
    res.status(500).json({ error: 'Error al agregar a lista de deseos' });
  }
});

// DELETE /:productId — remove from wishlist
router.delete('/:productId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    await prisma.wishlistItem.deleteMany({
      where: { userId: req.user!.id, productId: req.params.productId },
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar de lista de deseos' });
  }
});

// GET /check/:productId — check if product is in wishlist
router.get('/check/:productId', requireUserAuth, async (req: UserAuthRequest, res: Response) => {
  try {
    const item = await prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId: req.user!.id, productId: req.params.productId } },
    });
    res.json({ inWishlist: !!item });
  } catch {
    res.status(500).json({ error: 'Error al verificar lista de deseos' });
  }
});

export default router;
