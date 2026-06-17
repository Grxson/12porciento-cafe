import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  try {
    const bundles = await prisma.bundle.findMany({
      where: { isActive: true },
      include: { items: { include: { product: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ data: bundles });
  } catch {
    res.status(500).json({ error: 'Error al obtener bundles' });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const bundle = await prisma.bundle.findUnique({
      where: { id: req.params.id },
      include: { items: { include: { product: true } } },
    });
    if (!bundle) return res.status(404).json({ error: 'Bundle no encontrado' });
    res.json({ data: bundle });
  } catch {
    res.status(500).json({ error: 'Error al obtener bundle' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, basePrice, discountPct, imageUrl, items } = req.body;
    if (!name || typeof name !== 'string' || name.trim().length < 1) {
      return res.status(400).json({ error: 'Nombre requerido' });
    }
    if (typeof basePrice !== 'number' || basePrice <= 0) {
      return res.status(400).json({ error: 'Precio base inválido' });
    }
    if (typeof discountPct !== 'number' || discountPct < 0 || discountPct > 100) {
      return res.status(400).json({ error: 'Descuento debe ser entre 0 y 100' });
    }
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Se requiere al menos un producto' });
    }

    for (const item of items) {
      if (!item.productId || typeof item.productId !== 'string') {
        return res.status(400).json({ error: 'Cada item debe tener un productId válido' });
      }
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { isActive: true, name: true },
      });
      if (!product) {
        return res.status(400).json({ error: `Producto no encontrado` });
      }
      if (!product.isActive) {
        return res.status(400).json({ error: `El producto "${product.name}" no está activo` });
      }
      const qty = item.quantity || 1;
      if (!Number.isInteger(qty) || qty < 1) {
        return res.status(400).json({ error: 'Cantidad debe ser un entero positivo' });
      }
    }

    const finalPrice = Math.max(basePrice * (1 - discountPct / 100), 0);

    const bundle = await prisma.bundle.create({
      data: {
        name: name.trim(),
        description,
        basePrice,
        discountPct,
        finalPrice,
        imageUrl,
        items: {
          create: items.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity || 1,
          })),
        },
      },
      include: { items: { include: { product: true } } },
    });

    res.status(201).json({ data: bundle });
  } catch (e: any) {
    res.status(500).json({ error: 'Error al crear bundle', detail: e?.message });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { name, description, basePrice, discountPct, imageUrl, isActive } = req.body;
    if (discountPct !== undefined && (typeof discountPct !== 'number' || discountPct < 0 || discountPct > 100)) {
      return res.status(400).json({ error: 'Descuento debe ser entre 0 y 100' });
    }
    if (basePrice !== undefined && (typeof basePrice !== 'number' || basePrice <= 0)) {
      return res.status(400).json({ error: 'Precio base inválido' });
    }

    const existing = await prisma.bundle.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Bundle no encontrado' });

    const effectiveBase = basePrice ?? existing.basePrice;
    const effectiveDiscount = discountPct ?? existing.discountPct;
    const finalPrice = Math.max(effectiveBase * (1 - effectiveDiscount / 100), 0);

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (basePrice !== undefined) { updateData.basePrice = basePrice; updateData.finalPrice = finalPrice; }
    if (discountPct !== undefined) { updateData.discountPct = discountPct; updateData.finalPrice = finalPrice; }
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (isActive !== undefined) updateData.isActive = isActive;

    const bundle = await prisma.bundle.update({
      where: { id: req.params.id },
      data: updateData,
      include: { items: { include: { product: true } } },
    });

    res.json({ data: bundle });
  } catch (e: any) {
    res.status(500).json({ error: 'Error al actualizar bundle', detail: e?.message });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.bundle.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar bundle' });
  }
});

export default router;
