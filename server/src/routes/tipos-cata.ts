import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const isActiveParam = req.query.isActive as string | undefined;
    const where: Record<string, unknown> = {};
    if (isActiveParam !== undefined) where.isActive = isActiveParam === 'true';

    const data = await prisma.tipoCata.findMany({
      where,
      orderBy: { nombre: 'asc' },
    });
    res.json({ data });
  } catch (err) {
    console.error('[tipos-cata] GET /', err);
    res.status(500).json({ error: 'Error al obtener tipos de cata' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { nombre, categoria } = req.body;
    if (!nombre?.trim()) {
      return res.status(400).json({ error: 'Nombre es requerido' });
    }
    const tipo = await prisma.tipoCata.create({
      data: { nombre: nombre.trim(), categoria: categoria?.trim() || null },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'TipoCata',
      entityId: tipo.id,
      metadata: { nombre },
    });
    res.status(201).json({ data: tipo });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(400).json({ error: 'Este tipo de cata ya existe' });
    }
    console.error('[tipos-cata] POST /', err);
    res.status(500).json({ error: 'Error al crear tipo de cata' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exists = await prisma.tipoCata.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'Tipo de cata no encontrado' });

    const { nombre, categoria, isActive } = req.body;
    const updated = await prisma.tipoCata.update({
      where: { id: req.params.id },
      data: {
        nombre: nombre?.trim() ?? exists.nombre,
        categoria: categoria !== undefined ? (categoria?.trim() ?? null) : exists.categoria,
        isActive:
          isActive !== undefined ? isActive === true || isActive === 'true' : exists.isActive,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'TipoCata',
      entityId: exists.id,
      metadata: { nombre: exists.nombre },
    });
    res.json({ data: updated });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2002') {
      return res.status(400).json({ error: 'Ya existe un tipo de cata con ese nombre' });
    }
    console.error('[tipos-cata] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar tipo de cata' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const tipo = await prisma.tipoCata.findUnique({ where: { id: req.params.id } });
    if (!tipo) return res.status(404).json({ error: 'Tipo de cata no encontrado' });
    await prisma.tipoCata.delete({ where: { id: req.params.id } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'TipoCata',
      entityId: tipo.id,
      metadata: { nombre: tipo.nombre },
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[tipos-cata] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar tipo de cata' });
  }
});

export default router;
