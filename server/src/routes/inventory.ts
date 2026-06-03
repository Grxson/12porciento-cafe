import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

// GET / — inventory overview: all products with stock info + summary stats
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true, name: true, slug: true, category: true, imageUrl: true,
        price: true, stock: true, lowStockThreshold: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const totalUnits = products.reduce((s: number, p: typeof products[0]) => s + p.stock, 0);
    const totalValue = products.reduce((s: number, p: typeof products[0]) => s + p.stock * p.price, 0);
    const lowStock   = products.filter((p: typeof products[0]) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const outOfStock = products.filter((p: typeof products[0]) => p.stock === 0);

    res.json({
      summary: {
        totalSKUs: products.length,
        activeSKUs: products.filter((p: typeof products[0]) => p.isActive).length,
        totalUnits,
        totalValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      products: products.map((p: typeof products[0]) => ({
        ...p,
        status: p.stock === 0 ? 'OUT' : p.stock <= p.lowStockThreshold ? 'LOW' : 'OK',
        inventoryValue: p.stock * p.price,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener inventario' });
  }
});

// GET /movements — paginated movement history with filters
router.get('/movements', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, type, dateFrom, dateTo, page, pageSize } = req.query;
    const where: any = {};
    if (productId) where.productId = productId;
    if (type) where.type = type;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) { const e = new Date(dateTo as string); e.setHours(23, 59, 59, 999); where.createdAt.lte = e; }
    }

    const ps = pageSize ? Math.min(parseInt(pageSize as string), 200) : 50;
    const pg = page ? Math.max(parseInt(page as string) - 1, 0) : 0;

    const [movements, total] = await prisma.$transaction([
      prisma.stockMovement.findMany({
        where,
        include: { product: { select: { id: true, name: true, imageUrl: true, category: true } } },
        orderBy: { createdAt: 'desc' },
        take: ps,
        skip: pg * ps,
      }),
      prisma.stockMovement.count({ where }),
    ]);

    res.json({ data: movements, total, page: pg + 1, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch {
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// GET /products/:id/movements — movements for a single product
router.get('/products/:id/movements', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const movements = await prisma.stockMovement.findMany({
      where: { productId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    res.json(movements);
  } catch {
    res.status(500).json({ error: 'Error al obtener movimientos' });
  }
});

// POST /adjust — manual stock adjustment
router.post('/adjust', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { productId, type, quantity, notes } = req.body as {
      productId: string;
      type: 'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN';
      quantity: number;
      notes?: string;
    };

    if (!productId || !type || quantity === undefined) {
      res.status(400).json({ error: 'productId, type y quantity son requeridos' });
      return;
    }

    const validTypes = ['RESTOCK', 'ADJUSTMENT', 'LOSS', 'RETURN'];
    if (!validTypes.includes(type)) {
      res.status(400).json({ error: 'Tipo de movimiento inválido' });
      return;
    }

    if (quantity === 0) {
      res.status(400).json({ error: 'La cantidad debe ser distinta de 0' });
      return;
    }

    // Determine direction: RESTOCK and RETURN are always positive (in), LOSS always negative (out)
    // ADJUSTMENT can be either — use the sign of quantity
    const delta =
      type === 'RESTOCK' || type === 'RETURN' ? Math.abs(quantity) :
      type === 'LOSS' ? -Math.abs(quantity) :
      quantity; // ADJUSTMENT: respect sign

    const product = await prisma.product.findUnique({ where: { id: productId }, select: { stock: true } });
    if (!product) { res.status(404).json({ error: 'Producto no encontrado' }); return; }

    const newStock = product.stock + delta;
    if (newStock < 0) {
      res.status(400).json({ error: `Stock insuficiente. Stock actual: ${product.stock}, ajuste: ${delta}` });
      return;
    }

    const [updatedProduct, movement] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stock: newStock },
        select: { id: true, name: true, stock: true },
      }),
      prisma.stockMovement.create({
        data: {
          productId,
          type,
          quantity: delta,
          previousStock: product.stock,
          newStock,
          notes: notes ?? null,
        },
      }),
    ]);

    res.json({ product: updatedProduct, movement });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al ajustar stock' });
  }
});

// PUT /products/:id/threshold — update low stock threshold
router.put('/products/:id/threshold', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { threshold } = req.body;
    if (typeof threshold !== 'number' || threshold < 0) {
      res.status(400).json({ error: 'Umbral inválido' });
      return;
    }
    const product = await prisma.product.update({
      where: { id: req.params.id },
      data: { lowStockThreshold: threshold },
      select: { id: true, name: true, stock: true, lowStockThreshold: true },
    });
    res.json(product);
  } catch {
    res.status(500).json({ error: 'Error al actualizar umbral' });
  }
});

export default router;
