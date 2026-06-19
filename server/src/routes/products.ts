import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

const VALID_CATEGORIES = ['CAFÉ', 'ACCESORIOS', 'MERCH'];

function validateProduct(body: any, isCreate: boolean): string | null {
  const { name, slug, description, price, stock, imageUrl, weight, scaScore, category } = body;

  if (isCreate || name !== undefined) {
    if (!name || typeof name !== 'string' || name.trim().length < 2 || name.length > 100) {
      return 'Nombre debe tener entre 2 y 100 caracteres';
    }
  }
  if (isCreate || slug !== undefined) {
    if (!slug || typeof slug !== 'string' || slug.trim().length < 2 || slug.length > 100) {
      return 'Slug debe tener entre 2 y 100 caracteres';
    }
  }
  if (isCreate || description !== undefined) {
    if (!description || typeof description !== 'string' || description.trim().length < 5 || description.length > 1000) {
      return 'Descripción debe tener entre 5 y 1000 caracteres';
    }
  }
  if (isCreate || price !== undefined) {
    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      return 'Precio debe ser mayor a 0';
    }
  }
  if (isCreate || stock !== undefined) {
    const stockNum = Number(stock);
    if (!Number.isInteger(stockNum) || stockNum < 0) {
      return 'Stock debe ser un entero mayor o igual a 0';
    }
  }
  if (isCreate || imageUrl !== undefined) {
    if (!imageUrl || typeof imageUrl !== 'string' || imageUrl.trim().length < 5 || imageUrl.length > 500) {
      return 'URL de imagen inválida';
    }
  }
  if (weight !== undefined && weight !== null) {
    const weightNum = Number(weight);
    if (!Number.isInteger(weightNum) || weightNum < 1 || weightNum > 5000) {
      return 'Peso debe ser entre 1 y 5000 gramos';
    }
  }
  if (scaScore !== undefined && scaScore !== null) {
    const scaNum = Number(scaScore);
    if (!Number.isFinite(scaNum) || scaNum < 0 || scaNum > 100) {
      return 'SCA score debe ser entre 0 y 100';
    }
  }
  if (category !== undefined && category !== null && !VALID_CATEGORIES.includes(category)) {
    return 'Categoría inválida';
  }

  const stringMaxChecks = [
    ['process', 50],
    ['roastLevel', 50],
    ['region', 100],
    ['origin', 100],
    ['variety', 100],
    ['sku', 50],
    ['supplier', 100],
  ] as const;
  for (const [key, max] of stringMaxChecks) {
    const val = body[key];
    if (val !== undefined && val !== null && (typeof val !== 'string' || val.length > max)) {
      return `${key} debe tener máximo ${max} caracteres`;
    }
  }

  if (body.altitude !== undefined && body.altitude !== null && !Number.isInteger(Number(body.altitude))) {
    return 'Altitud debe ser un número entero';
  }
  if (body.costPrice !== undefined && body.costPrice !== null) {
    const costNum = Number(body.costPrice);
    if (!Number.isFinite(costNum) || costNum < 0) return 'Costo debe ser mayor o igual a 0';
  }
  if (body.minOrderQty !== undefined && body.minOrderQty !== null && (!Number.isInteger(Number(body.minOrderQty)) || body.minOrderQty < 1)) {
    return 'Cantidad mínima de orden debe ser al menos 1';
  }
  if (body.lowStockThreshold !== undefined && body.lowStockThreshold !== null && (!Number.isInteger(Number(body.lowStockThreshold)) || body.lowStockThreshold < 0)) {
    return 'Umbral de stock bajo debe ser mayor o igual a 0';
  }

  return null;
}

const parseProduct = (p: any) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors) : [],
  images: p.images ? JSON.parse(p.images) : [],
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const { process, roast, limited, limit, category, sort, search, flavors, page, pageSize } = req.query;
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
    if (flavors) {
      const flavorArray = (flavors as string).split(',').map((f) => f.trim()).filter(Boolean);
      if (flavorArray.length > 0) {
        const flavorConditions = flavorArray.map((f) => ({ flavors: { contains: f } }));
        if (where.OR) {
          where.AND = [{ OR: where.OR }, { OR: flavorConditions }];
          delete where.OR;
        } else {
          where.OR = flavorConditions;
        }
      }
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

router.get('/admin/all', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const where = includeInactive ? {} : { isActive: true };
    const products = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(products.map(parseProduct));
  } catch {
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// GET /api/products/gallery — public, returns active products with images
router.get('/gallery', async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true, imageUrl: { not: '' } },
      select: {
        id: true,
        name: true,
        slug: true,
        imageUrl: true,
        images: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const images = products.flatMap((p) => {
      const urls = [p.imageUrl, ...(p.images ? JSON.parse(p.images) : [])].filter(Boolean);
      return urls.map((url: string) => ({
        id: `${p.id}-${url}`,
        url,
        alt: p.name,
        productName: p.name,
        productSlug: p.slug,
      }));
    });
    res.json({ images });
  } catch (err) {
    console.error('[gallery] Error:', err);
    res.status(500).json({ error: 'Error al cargar la galería' });
  }
});

// IMPORTANT: keep /:slug route after /gallery so 'gallery' is not caught as a slug param

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
    const validationError = validateProduct(req.body, true);
    if (validationError) { res.status(400).json({ error: validationError }); return; }

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
    const validationError = validateProduct(req.body, false);
    if (validationError) { res.status(400).json({ error: validationError }); return; }

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
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { isActive: true } });
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }
    if (!product.isActive) { res.status(400).json({ error: 'El producto ya está inactivo' }); return; }
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
