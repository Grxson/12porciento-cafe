import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const parseProduct = (p: any) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors) : [],
  images: p.images ? JSON.parse(p.images) : [],
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { process, roast, limited, limit, category, sort, search, page, pageSize } = req.query;
    const where: any = { isActive: true };
    if (process) where.process = process;
    if (roast) where.roastLevel = roast;
    if (limited === 'true') where.isLimited = true;
    if (category && category !== 'TODOS') where.category = category;
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    const orderBy: any =
      sort === 'sca'        ? { scaScore: 'desc' } :
      sort === 'price_asc'  ? { price: 'asc' } :
      sort === 'price_desc' ? { price: 'desc' } :
                              { createdAt: 'desc' };

    const psRaw = parseInt(pageSize as string);
    const ps = Number.isInteger(psRaw) ? Math.min(psRaw, 100) : undefined;
    const pgRaw = parseInt(page as string);
    const pg = Number.isInteger(pgRaw) ? Math.max(pgRaw - 1, 0) : 0;
    const limitRaw = parseInt(limit as string);

    const [products, total] = await prisma.$transaction([
      prisma.product.findMany({
        where,
        orderBy,
        take: ps ?? (Number.isInteger(limitRaw) ? limitRaw : undefined),
        skip: ps ? pg * ps : undefined,
      }),
      prisma.product.count({ where }),
    ]);

    res.json({
      data: products.map(parseProduct),
      total,
      page: pg + 1,
      pageSize: ps ?? total,
      totalPages: ps ? Math.ceil(total / ps) : 1,
    });
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
    const { flavors, images, recipes, sku, costPrice, supplier, minOrderQty, ...data } = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        flavors: flavors ? JSON.stringify(flavors) : null,
        images: images && images.length ? JSON.stringify(images) : null,
        sku: sku?.trim() || null,
        costPrice: costPrice !== undefined && costPrice !== '' ? parseFloat(costPrice) : null,
        supplier: supplier?.trim() || null,
        minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
      },
    });
    res.status(201).json(parseProduct(product));
  } catch (e: any) {
    res.status(500).json({ error: 'Error al crear producto', detail: e?.message });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { flavors, images, recipes, sku, costPrice, supplier, minOrderQty, ...data } = req.body;
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(flavors !== undefined && { flavors: JSON.stringify(flavors) }),
        ...(images !== undefined && { images: images && images.length ? JSON.stringify(images) : null }),
        ...(sku !== undefined && { sku: sku?.trim() || null }),
        ...(costPrice !== undefined && { costPrice: costPrice !== '' ? parseFloat(costPrice) : null }),
        ...(supplier !== undefined && { supplier: supplier?.trim() || null }),
        ...(minOrderQty !== undefined && { minOrderQty: minOrderQty ? parseInt(minOrderQty) : null }),
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
