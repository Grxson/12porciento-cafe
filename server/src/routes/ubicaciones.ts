import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 50;
    const search = req.query.search as string | undefined;
    const isActiveParam = req.query.isActive as string | undefined;

    const where: Record<string, unknown> = {};
    if (isActiveParam !== undefined) where.isActive = isActiveParam === 'true';
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { pais: { contains: search, mode: 'insensitive' } },
        { estado: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.ubicacion.findMany({
        where,
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.ubicacion.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[ubicaciones] GET /', err);
    res.status(500).json({ error: 'Error al obtener ubicaciones' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { lotes: true } } },
    });
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada' });
    res.json({ data: ubicacion });
  } catch (err) {
    console.error('[ubicaciones] GET /:id', err);
    res.status(500).json({ error: 'Error al obtener ubicación' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, pais, estado } = req.body;
    if (!nombre?.trim() || !pais?.trim()) {
      return res.status(400).json({ error: 'Nombre y país son requeridos' });
    }
    const ubicacion = await prisma.ubicacion.create({
      data: { nombre: nombre.trim(), pais: pais.trim(), estado: estado?.trim() || null },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Ubicacion',
      entityId: ubicacion.id,
      metadata: { nombre },
    });
    res.status(201).json({ data: ubicacion });
  } catch (err) {
    console.error('[ubicaciones] POST /', err);
    res.status(500).json({ error: 'Error al crear ubicación' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exists = await prisma.ubicacion.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'Ubicación no encontrada' });

    const { nombre, pais, estado, isActive } = req.body;
    const updated = await prisma.ubicacion.update({
      where: { id: req.params.id },
      data: {
        nombre: nombre?.trim() ?? exists.nombre,
        pais: pais?.trim() ?? exists.pais,
        estado: estado !== undefined ? (estado?.trim() ?? null) : exists.estado,
        isActive:
          isActive !== undefined ? isActive === true || isActive === 'true' : exists.isActive,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Ubicacion',
      entityId: exists.id,
      metadata: { nombre: exists.nombre },
    });
    res.json({ data: updated });
  } catch (err) {
    console.error('[ubicaciones] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar ubicación' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { lotes: true } } },
    });
    if (!ubicacion) return res.status(404).json({ error: 'Ubicación no encontrada' });
    if (ubicacion._count.lotes > 0) {
      return res.status(400).json({ error: 'No se puede eliminar ubicación con lotes asociados' });
    }
    await prisma.ubicacion.delete({ where: { id: req.params.id } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Ubicacion',
      entityId: ubicacion.id,
      metadata: { nombre: ubicacion.nombre },
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[ubicaciones] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar ubicación' });
  }
});

export default router;
