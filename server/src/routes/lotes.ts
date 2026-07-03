import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

function includeClause() {
  return {
    product: { select: { id: true, name: true, sku: true } },
    caficultor: { select: { id: true, nombre: true, region: true } },
    ubicacion: { select: { id: true, nombre: true, pais: true, estado: true } },
  };
}

// GET /api/lotes/suppliers — distinct supplier list
router.get('/suppliers', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const result = await prisma.lote.findMany({
      where: { supplier: { not: null } },
      select: { supplier: true },
      distinct: ['supplier'],
      orderBy: { supplier: 'asc' },
    });
    res.json({ data: result.map((r) => r.supplier) });
  } catch (err) {
    console.error('[lotes] GET /suppliers', err);
    res.status(500).json({ error: 'Error al obtener proveedores' });
  }
});

// GET /api/lotes — paginated list with filters
router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const status = req.query.status as string | undefined;
    const productId = req.query.productId as string | undefined;
    const caficultorId = req.query.caficultorId as string | undefined;
    const search = req.query.search as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (productId) where.productId = productId;
    if (caficultorId) where.caficultorId = caficultorId;
    if (search) {
      where.OR = [
        { batchNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.lote.findMany({
        where,
        include: includeClause(),
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.lote.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[lotes] GET /', err);
    res.status(500).json({ error: 'Error al obtener lotes' });
  }
});

// GET /api/lotes/:id
router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where: { id: req.params.id },
      include: {
        ...includeClause(),
        product: { select: { id: true, name: true, sku: true, stock: true } },
      },
    });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    res.json({ data: lote });
  } catch (err) {
    console.error('[lotes] GET /:id', err);
    res.status(500).json({ error: 'Error al obtener lote' });
  }
});

// POST /api/lotes
router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      productId,
      batchNumber,
      quantity,
      costPerKg,
      unitCost,
      supplier,
      origin,
      caficultorId,
      ubicacionId,
      receivedAt,
      expiryDate,
      notes,
    } = req.body;

    if (!productId || !batchNumber || !quantity) {
      return res.status(400).json({ error: 'productId, batchNumber y quantity son requeridos' });
    }

    // Auto-prefix LOT if batchNumber doesn't start with it
    const upper = (batchNumber as string).toUpperCase();
    if (!upper.startsWith('LOT')) {
      batchNumber = `LOT-${batchNumber}`;
    }

    const lote = await prisma.lote.create({
      data: {
        productId,
        batchNumber,
        quantity: parseInt(quantity),
        costPerKg: costPerKg ? parseFloat(costPerKg) : null,
        unitCost: unitCost ? parseFloat(unitCost) : null,
        supplier: supplier || null,
        origin: origin || null,
        caficultorId: caficultorId || null,
        ubicacionId: ubicacionId || null,
        receivedAt: receivedAt ? new Date(receivedAt) : undefined,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
        status: 'CUARENTENA',
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber, productId, quantity },
    });

    res.status(201).json({ data: lote });
  } catch (err: unknown) {
    console.error('[lotes] POST /', err);
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(400).json({ error: 'Número de lote ya existe' });
    }
    res.status(500).json({ error: 'Error al crear lote' });
  }
});

// PUT /api/lotes/:id
router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });

    const {
      notes,
      humedad,
      defectos,
      scoreAroma,
      scoreSabor,
      scoreAcidez,
      scoreBody,
      scoreFinal,
      expiryDate,
      quantity,
      costPerKg,
      unitCost,
      supplier,
      origin,
      caficultorId,
      ubicacionId,
    } = req.body;

    const updated = await prisma.lote.update({
      where: { id: req.params.id },
      data: {
        notes: notes ?? lote.notes,
        humedad: humedad != null ? parseFloat(humedad) : lote.humedad,
        defectos: defectos != null ? parseInt(defectos) : lote.defectos,
        scoreAroma: scoreAroma != null ? parseFloat(scoreAroma) : lote.scoreAroma,
        scoreSabor: scoreSabor != null ? parseFloat(scoreSabor) : lote.scoreSabor,
        scoreAcidez: scoreAcidez != null ? parseFloat(scoreAcidez) : lote.scoreAcidez,
        scoreBody: scoreBody != null ? parseFloat(scoreBody) : lote.scoreBody,
        scoreFinal: scoreFinal != null ? parseFloat(scoreFinal) : lote.scoreFinal,
        expiryDate: expiryDate ? new Date(expiryDate) : lote.expiryDate,
        quantity: quantity != null ? parseInt(quantity) : lote.quantity,
        costPerKg: costPerKg != null ? parseFloat(costPerKg) : lote.costPerKg,
        unitCost: unitCost != null ? parseFloat(unitCost) : lote.unitCost,
        supplier: supplier ?? lote.supplier,
        origin: origin ?? lote.origin,
        caficultorId: caficultorId !== undefined ? caficultorId || null : lote.caficultorId,
        ubicacionId: ubicacionId !== undefined ? ubicacionId || null : lote.ubicacionId,
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error('[lotes] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar lote' });
  }
});

// PATCH /api/lotes/:id/aprobar
router.patch('/:id/aprobar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({
      where: { id: req.params.id },
      include: { product: true },
    });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'CUARENTENA') {
      return res.status(400).json({ error: 'Solo lotes en cuarentena pueden aprobarse' });
    }

    const { notes } = req.body;
    const now = new Date();

    const [updatedLote] = await prisma.$transaction([
      prisma.lote.update({
        where: { id: lote.id },
        data: {
          status: 'APROBADO',
          approvedAt: now,
          approvedBy: req.admin?.id,
          evaluadoPor: req.admin?.id,
          notes: notes ?? lote.notes,
        },
      }),
      prisma.stockMovement.create({
        data: {
          productId: lote.productId,
          type: 'RESTOCK',
          quantity: lote.quantity,
          previousStock: lote.product.stock,
          newStock: lote.product.stock + lote.quantity,
          notes: `Lote aprobado: ${lote.batchNumber}`,
          batchNumber: lote.batchNumber,
          expiryDate: lote.expiryDate,
          supplier: lote.supplier,
          unitCost: lote.unitCost,
        },
      }),
      prisma.product.update({
        where: { id: lote.productId },
        data: { stock: { increment: lote.quantity } },
      }),
    ]);

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'APPROVE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber, quantity: lote.quantity },
    });

    res.json({ data: updatedLote });
  } catch (err) {
    console.error('[lotes] PATCH /:id/aprobar', err);
    res.status(500).json({ error: 'Error al aprobar lote' });
  }
});

// PATCH /api/lotes/:id/rechazar
router.patch('/:id/rechazar', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'CUARENTENA') {
      return res.status(400).json({ error: 'Solo lotes en cuarentena pueden rechazarse' });
    }

    const { rejectionReason } = req.body;
    if (!rejectionReason?.trim()) {
      return res.status(400).json({ error: 'Se requiere motivo de rechazo' });
    }

    const now = new Date();
    const updated = await prisma.lote.update({
      where: { id: req.params.id },
      data: {
        status: 'RECHAZADO',
        rejectedAt: now,
        rejectedBy: req.admin?.id,
        rejectionReason: rejectionReason.trim(),
      },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'STATUS_CHANGE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber, rejectionReason },
    });

    res.json({ data: updated });
  } catch (err) {
    console.error('[lotes] PATCH /:id/rechazar', err);
    res.status(500).json({ error: 'Error al rechazar lote' });
  }
});

// DELETE /api/lotes/:id (only RECHAZADO)
router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const lote = await prisma.lote.findUnique({ where: { id: req.params.id } });
    if (!lote) return res.status(404).json({ error: 'Lote no encontrado' });
    if (lote.status !== 'RECHAZADO') {
      return res.status(400).json({ error: 'Solo lotes rechazados pueden eliminarse' });
    }

    await prisma.lote.delete({ where: { id: req.params.id } });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Lote',
      entityId: lote.id,
      metadata: { batchNumber: lote.batchNumber },
    });

    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[lotes] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar lote' });
  }
});

export default router;
