import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

// GET / — inventory overview: all products with stock info + summary stats
router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        id: true, name: true, slug: true, category: true, imageUrl: true,
        price: true, costPrice: true, stock: true, lowStockThreshold: true,
        isActive: true, sku: true, supplier: true,
      },
      orderBy: { name: 'asc' },
    });

    type P = typeof products[number];
    const totalUnits = products.reduce((s: number, p: P) => s + p.stock, 0);
    const totalValue = products.reduce((s: number, p: P) => s + p.stock * p.price, 0);
    const lowStock   = products.filter((p: P) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const outOfStock = products.filter((p: P) => p.stock === 0);

    res.json({
      summary: {
        totalSKUs: products.length,
        activeSKUs: products.filter((p: P) => p.isActive).length,
        totalUnits,
        totalValue,
        lowStockCount: lowStock.length,
        outOfStockCount: outOfStock.length,
      },
      products: products.map((p: P) => ({
        ...p,
        status: p.stock === 0 ? 'OUT' : p.stock <= p.lowStockThreshold ? 'LOW' : 'OK',
        inventoryValue: p.stock * p.price,
        costValue: p.costPrice ? p.stock * p.costPrice : null,
        margin: p.costPrice ? ((p.price - p.costPrice) / p.price * 100).toFixed(1) : null,
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
    const where: Prisma.StockMovementWhereInput = {};
    if (productId) where.productId = productId as string;
    if (type) where.type = type as string;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom as string);
      if (dateTo) { const e = new Date(dateTo as string); e.setHours(23, 59, 59, 999); where.createdAt.lte = e; }
    }

    const ps = Math.min(parseInt(pageSize as string) || 50, 200);
    const pg = Math.max((parseInt(page as string) || 1) - 1, 0);

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
    const { productId, type, quantity, notes, unitCost, batchNumber, expiryDate, supplier } = req.body as {
      productId: string;
      type: 'RESTOCK' | 'ADJUSTMENT' | 'LOSS' | 'RETURN';
      quantity: number;
      notes?: string;
      unitCost?: number;
      batchNumber?: string;
      expiryDate?: string;
      supplier?: string;
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

    const qty = Number(quantity);
    if (!Number.isInteger(qty) || qty === 0 || Math.abs(qty) > 100_000) {
      res.status(400).json({ error: 'La cantidad debe ser un entero no cero (máx 100,000)' });
      return;
    }
    if (notes && (typeof notes !== 'string' || notes.length > 500)) {
      res.status(400).json({ error: 'Notas demasiado largas (máx 500 caracteres)' });
      return;
    }

    // Determine direction: RESTOCK and RETURN are always positive (in), LOSS always negative (out)
    // ADJUSTMENT can be either — use the sign of quantity
    const delta =
      type === 'RESTOCK' || type === 'RETURN' ? Math.abs(qty) :
      type === 'LOSS' ? -Math.abs(qty) :
      qty; // ADJUSTMENT: respect sign

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
          unitCost: unitCost ?? null,
          batchNumber: batchNumber?.trim() ?? null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          supplier: supplier?.trim() ?? null,
        },
      }),
    ]);

    logAdminAction({ adminId: req.admin?.id, action: 'ADJUST', entity: 'Inventory', entityId: productId, metadata: { type, quantity: delta, previousStock: product.stock, newStock } });
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

// GET /alerts — products that need attention
router.get('/alerts', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, slug: true, sku: true, category: true,
        stock: true, lowStockThreshold: true, price: true, costPrice: true,
        supplier: true, imageUrl: true,
      },
    });

    type P = typeof products[number];

    const outOfStock = products.filter((p: P) => p.stock === 0);
    const lowStock = products.filter((p: P) => p.stock > 0 && p.stock <= p.lowStockThreshold);
    const overstock = products.filter((p: P) => p.stock > p.lowStockThreshold * 10);

    const soon = new Date();
    soon.setDate(soon.getDate() + 30);
    const expiringMovements = await prisma.stockMovement.findMany({
      where: {
        expiryDate: { lte: soon, gte: new Date() },
        type: 'RESTOCK',
      },
      include: { product: { select: { id: true, name: true } } },
      orderBy: { expiryDate: 'asc' },
    });

    type M = typeof expiringMovements[number];
    res.json({
      outOfStock,
      lowStock,
      overstock,
      expiringBatches: expiringMovements.map((m: M) => ({
        productId: m.productId,
        productName: m.product.name,
        batchNumber: m.batchNumber,
        expiryDate: m.expiryDate,
        quantity: m.quantity,
      })),
      summary: {
        outOfStockCount: outOfStock.length,
        lowStockCount: lowStock.length,
        overstockCount: overstock.length,
        expiringCount: expiringMovements.length,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener alertas' });
  }
});

// GET /export-csv — download inventory as CSV
router.get('/export-csv', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      select: {
        sku: true, name: true, category: true, stock: true, lowStockThreshold: true,
        price: true, costPrice: true, supplier: true, weight: true, isActive: true,
      },
      orderBy: { name: 'asc' },
    });

    const headers = ['SKU', 'Nombre', 'Categoría', 'Stock', 'Umbral', 'Precio', 'Costo', 'Proveedor', 'Peso (g)', 'Activo'];
    type P = typeof products[number];
    const rows = products.map((p: P) => [
      p.sku ?? '',
      p.name,
      p.category,
      p.stock,
      p.lowStockThreshold,
      p.price.toFixed(2),
      p.costPrice?.toFixed(2) ?? '',
      p.supplier ?? '',
      p.weight ?? '',
      p.isActive ? 'Sí' : 'No',
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell: string | number | boolean | null) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="inventario-${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send('﻿' + csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al exportar inventario' });
  }
});

export default router;
