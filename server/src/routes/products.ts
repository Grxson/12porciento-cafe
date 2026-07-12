import { Router, Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

const VALID_CATEGORIES = ['CAFÉ', 'ACCESORIOS', 'MERCH'];

function validateProduct(body: Record<string, unknown>, isCreate: boolean): string | null {
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
    if (
      !description ||
      typeof description !== 'string' ||
      description.trim().length < 5 ||
      description.length > 1000
    ) {
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
    if (
      !imageUrl ||
      typeof imageUrl !== 'string' ||
      imageUrl.trim().length < 5 ||
      imageUrl.length > 500
    ) {
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
  if (
    category !== undefined &&
    category !== null &&
    !VALID_CATEGORIES.includes(category as string)
  ) {
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

  if (
    body.altitude !== undefined &&
    body.altitude !== null &&
    !Number.isInteger(Number(body.altitude))
  ) {
    return 'Altitud debe ser un número entero';
  }
  if (body.costPrice !== undefined && body.costPrice !== null) {
    const costNum = Number(body.costPrice);
    if (!Number.isFinite(costNum) || costNum < 0) return 'Costo debe ser mayor o igual a 0';
  }
  if (
    body.minOrderQty !== undefined &&
    body.minOrderQty !== null &&
    (!Number.isInteger(Number(body.minOrderQty)) || (body.minOrderQty as number) < 1)
  ) {
    return 'Cantidad mínima de orden debe ser al menos 1';
  }
  if (
    body.lowStockThreshold !== undefined &&
    body.lowStockThreshold !== null &&
    (!Number.isInteger(Number(body.lowStockThreshold)) || (body.lowStockThreshold as number) < 0)
  ) {
    return 'Umbral de stock bajo debe ser mayor o igual a 0';
  }

  return null;
}

const parseProduct = (p: Record<string, unknown>) => ({
  ...p,
  flavors: p.flavors ? JSON.parse(p.flavors as string) : [],
  images: p.images ? JSON.parse(p.images as string) : [],
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      process,
      roast,
      limited,
      limit,
      category,
      sort,
      search,
      flavors,
      page,
      pageSize,
      body,
      acidity,
      brewMethod,
      certifications,
    } = req.query;
    const where: Prisma.ProductWhereInput = { isActive: true };
    const andConditions: Prisma.ProductWhereInput[] = [];
    if (process) where.process = process as string;
    if (roast) where.roastLevel = roast as string;
    if (limited === 'true') where.isLimited = true;
    if (category && category !== 'TODOS') where.category = category as string;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    if (flavors) {
      const flavorArray = (flavors as string)
        .split(',')
        .map((f) => f.trim())
        .filter(Boolean);
      if (flavorArray.length > 0) {
        const flavorConditions = flavorArray.map((f) => ({ flavors: { contains: f } }));
        andConditions.push({ OR: flavorConditions });
      }
    }
    if (body && typeof body === 'string') {
      const aliases: Record<string, string[]> = {
        Ligero: ['Ligero', 'Sedoso'],
        Medio: ['Medio', 'Balanceado'],
        Completo: ['Completo', 'Robusto', 'Alto'],
      };
      const values = aliases[body] ?? [body];
      andConditions.push({
        OR: values.map((value) => ({ body: { contains: value, mode: 'insensitive' } })),
      });
    }
    if (acidity && typeof acidity === 'string') {
      const aliases: Record<string, string[]> = {
        Baja: ['Baja', 'Suave'],
        Media: ['Media', 'Balanceada'],
        Alta: ['Alta', 'Brillante'],
      };
      const values = aliases[acidity] ?? [acidity];
      andConditions.push({
        OR: values.map((value) => ({ acidity: { contains: value, mode: 'insensitive' } })),
      });
    }
    if (brewMethod && typeof brewMethod === 'string') {
      andConditions.push({ recommendedBrewMethod: { contains: brewMethod, mode: 'insensitive' } });
    }
    if (certifications && typeof certifications === 'string') {
      const values = certifications
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .slice(0, 10);
      if (values.length > 0) {
        andConditions.push({
          productCertifications: {
            some: {
              isVerified: true,
              OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
              certification: {
                isActive: true,
                OR: [
                  { slug: { in: values, mode: 'insensitive' } },
                  ...values.map((value) => ({
                    name: { equals: value, mode: 'insensitive' as const },
                  })),
                ],
              },
            },
          },
        });
      }
    }
    if (where.OR) {
      andConditions.unshift({ OR: where.OR });
      delete where.OR;
    }
    if (andConditions.length > 0) where.AND = andConditions;

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      sort === 'sca'
        ? { scaScore: 'desc' }
        : sort === 'price_asc'
          ? { price: 'asc' }
          : sort === 'price_desc'
            ? { price: 'desc' }
            : { createdAt: 'desc' };

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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 50));
    const skip = (page - 1) * pageSize;
    const search = (req.query.search as string) || '';
    const category = (req.query.category as string) || '';

    const where: Prisma.ProductWhereInput = {};
    // Admin always sees all products (active + inactive) unless explicitly filtered
    if (req.query.isActive === 'true') where.isActive = true;
    if (req.query.isActive === 'false') where.isActive = false;
    if (category && category !== 'TODOS') where.category = category;
    if (req.query.caficultorId) where.caficultorId = req.query.caficultorId as string;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: 'desc' },
        include: { caficultor: { select: { id: true, nombre: true, region: true } } },
      }),
      prisma.product.count({ where }),
    ]);
    res.json({
      data: products.map(parseProduct),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
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
    const images = products.flatMap(
      (p: {
        id: string;
        name: string;
        slug: string;
        imageUrl: string | null;
        images: string | null;
      }) => {
        const urls = [p.imageUrl, ...(p.images ? JSON.parse(p.images) : [])].filter(Boolean);
        return urls.map((url: string) => ({
          id: `${p.id}-${url}`,
          url,
          alt: p.name,
          productName: p.name,
          productSlug: p.slug,
        }));
      },
    );
    res.json({ images });
  } catch (err) {
    console.error('[gallery] Error:', err);
    res.status(500).json({ error: 'Error al cargar la galería' });
  }
});

router.get('/certifications', async (_req: Request, res: Response) => {
  try {
    const now = new Date();
    const certifications = await prisma.certification.findMany({
      where: {
        isActive: true,
        products: {
          some: {
            isVerified: true,
            OR: [{ validUntil: null }, { validUntil: { gte: now } }],
            product: { isActive: true },
          },
        },
      },
      select: { slug: true, name: true, issuer: true },
      orderBy: { name: 'asc' },
    });
    res.json({ data: certifications });
  } catch (err) {
    console.error('[products/certifications] Error:', err);
    res.status(500).json({ error: 'Error al cargar certificaciones' });
  }
});

// IMPORTANT: keep /:slug route after /gallery so 'gallery' is not caught as a slug param

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { slug: req.params.slug },
      include: {
        productCertifications: {
          where: {
            isVerified: true,
            OR: [{ validUntil: null }, { validUntil: { gte: new Date() } }],
            certification: { isActive: true },
          },
          select: {
            certificateId: true,
            evidenceUrl: true,
            validFrom: true,
            validUntil: true,
            certification: {
              select: { slug: true, name: true, issuer: true, description: true, websiteUrl: true },
            },
          },
        },
        versions: {
          where: { isActive: true },
          include: {
            caficultor: { select: { nombre: true, region: true } },
            lote: {
              include: {
                ubicacion: { select: { nombre: true, estado: true, pais: true } },
                traceabilityEvents: { orderBy: [{ sortOrder: 'asc' }, { occurredAt: 'asc' }] },
              },
            },
          },
          orderBy: { version: 'desc' },
          take: 1,
        },
      },
    });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    res.json(parseProduct(product as unknown as Record<string, unknown>));
  } catch {
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validationError = validateProduct(req.body, true);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const {
      flavors,
      images,
      recipes: _recipes,
      sku,
      costPrice,
      supplier,
      minOrderQty,
      caficultorId,
      ...data
    } = req.body;
    const product = await prisma.product.create({
      data: {
        ...data,
        flavors: flavors ? JSON.stringify(flavors) : null,
        images: images && images.length ? JSON.stringify(images) : null,
        sku: sku?.trim() || null,
        costPrice: costPrice !== undefined && costPrice !== '' ? parseFloat(costPrice) : null,
        supplier: supplier?.trim() || null,
        minOrderQty: minOrderQty ? parseInt(minOrderQty) : 1,
        caficultorId: caficultorId || null,
      },
    });
    logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Product',
      entityId: product.id,
      metadata: { name: product.name },
    });
    res.status(201).json(parseProduct(product));
  } catch (e: unknown) {
    res.status(500).json({
      error: 'Error al crear producto',
      detail: e instanceof Error ? e.message : undefined,
    });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const validationError = validateProduct(req.body, false);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const {
      flavors,
      images,
      recipes: _recipes,
      sku,
      costPrice,
      supplier,
      minOrderQty,
      caficultorId,
      ...data
    } = req.body;

    // Fetch old product for price logging + current caficultorId
    const oldProduct = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { price: true, caficultorId: true },
    });

    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: {
        ...data,
        ...(flavors !== undefined && { flavors: JSON.stringify(flavors) }),
        ...(images !== undefined && {
          images: images && images.length ? JSON.stringify(images) : null,
        }),
        ...(sku !== undefined && { sku: sku?.trim() || null }),
        ...(costPrice !== undefined && {
          costPrice: costPrice !== '' ? parseFloat(costPrice) : null,
        }),
        ...(supplier !== undefined && { supplier: supplier?.trim() || null }),
        ...(minOrderQty !== undefined && {
          minOrderQty: minOrderQty ? parseInt(minOrderQty) : null,
        }),
        caficultorId: caficultorId !== undefined ? caficultorId || null : oldProduct?.caficultorId,
      },
    });

    // Log PriceRecord if price changed
    const newPrice = data.price !== undefined ? Number(data.price) : undefined;
    if (newPrice !== undefined && oldProduct && oldProduct.price !== newPrice) {
      await prisma.priceRecord
        .create({
          data: { productId: req.params.id, price: newPrice },
        })
        .catch((e) => console.error('[priceRecord] Failed to log price change:', e));
    }

    logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Product',
      entityId: req.params.id,
      metadata: { name: product.name },
    });
    res.json(parseProduct(product));
  } catch (e: unknown) {
    res.status(500).json({
      error: 'Error al actualizar producto',
      detail: e instanceof Error ? e.message : undefined,
    });
  }
});

// GET /products/:id/price-history — returns up to 50 price records
router.get('/:id/price-history', async (req: Request, res: Response) => {
  try {
    const records = await prisma.priceRecord.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'asc' },
      take: 50,
    });
    res.json({ data: records });
  } catch {
    res.status(500).json({ error: 'Error al obtener historial de precios' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: req.params.id },
      select: { isActive: true },
    });
    if (!product) {
      res.status(404).json({ error: 'Producto no encontrado' });
      return;
    }
    if (!product.isActive) {
      res.status(400).json({ error: 'El producto ya está inactivo' });
      return;
    }
    await prisma.product.update({ where: { id: req.params.id }, data: { isActive: false } });
    logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Product',
      entityId: req.params.id,
    });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

export default router;
