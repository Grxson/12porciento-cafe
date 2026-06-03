import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const parseProduct = (p: any) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors) : [],
  recipes: p.recipes ? JSON.parse(p.recipes) : [],
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { process, roast, limited, limit, category } = req.query;
    const where: any = { isActive: true };
    if (process) where.process = process;
    if (roast) where.roastLevel = roast;
    if (limited === 'true') where.isLimited = true;
    if (category && category !== 'TODOS') where.category = category;

    const products = await prisma.product.findMany({
      where,
      take: limit ? parseInt(limit as string) : undefined,
      orderBy: { createdAt: 'desc' },
    });
    res.json(products.map(parseProduct));
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.get('/admin/all', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
    res.json(products.map(parseProduct));
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({ where: { slug: req.params.slug } });
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    res.json(parseProduct(product));
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { flavors, recipes, ...data } = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        flavors: flavors ? JSON.stringify(flavors) : null,
        recipes: recipes ? JSON.stringify(recipes) : null,
      },
    });
    res.status(201).json(parseProduct(product));
  } catch (e: any) {
    res.status(500).json({ error: 'Error al crear producto', detail: e?.message });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { flavors, recipes, ...data } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(flavors !== undefined && { flavors: JSON.stringify(flavors) }),
        ...(recipes !== undefined && { recipes: JSON.stringify(recipes) }),
      },
    });
    res.json(parseProduct(product));
  } catch (e: any) {
    res.status(500).json({ error: 'Error al actualizar producto', detail: e?.message });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
