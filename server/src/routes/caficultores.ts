import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const search = req.query.search as string | undefined;
    const isActiveParam = req.query.isActive as string | undefined;

    const where: Record<string, unknown> = {};
    if (isActiveParam !== undefined) where.isActive = isActiveParam === 'true';
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { region: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.caficultor.findMany({
        where,
        include: {
          _count: { select: { lotes: true } },
          tiposCata: { select: { id: true, nombre: true, categoria: true } },
        },
        orderBy: { nombre: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.caficultor.count({ where }),
    ]);

    res.json({ data, total, page, totalPages: Math.ceil(total / pageSize) });
  } catch (err) {
    console.error('[caficultores] GET /', err);
    res.status(500).json({ error: 'Error al obtener caficultores' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const c = await prisma.caficultor.findUnique({
      where: { id: req.params.id },
      include: {
        lotes: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { lotes: true, products: true } },
        tiposCata: { select: { id: true, nombre: true, categoria: true } },
      },
    });
    if (!c) return res.status(404).json({ error: 'Caficultor no encontrado' });
    res.json({ data: c });
  } catch (err) {
    console.error('[caficultores] GET /:id', err);
    res.status(500).json({ error: 'Error al obtener caficultor' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const {
      nombre,
      region,
      altitud,
      variedad,
      foto,
      contacto,
      bio,
      acuerdoPrecioKg,
      modalidad,
      fairTrade,
      notas,
      tipoCataIds,
    } = req.body;
    if (!nombre?.trim() || !region?.trim()) {
      return res.status(400).json({ error: 'Nombre y región son requeridos' });
    }
    const c = await prisma.caficultor.create({
      data: {
        nombre: nombre.trim(),
        region: region.trim(),
        altitud: altitud ? parseInt(altitud) : null,
        variedad: variedad?.trim() || null,
        foto: foto?.trim() || null,
        contacto: contacto?.trim() || null,
        bio: bio?.trim() || null,
        acuerdoPrecioKg: acuerdoPrecioKg ? parseFloat(acuerdoPrecioKg) : null,
        modalidad: modalidad || 'DIRECTO',
        fairTrade: fairTrade === true || fairTrade === 'true',
        notas: notas?.trim() || null,
        tiposCata: tipoCataIds?.length
          ? { connect: tipoCataIds.map((id: string) => ({ id })) }
          : undefined,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'Caficultor',
      entityId: c.id,
      metadata: { nombre },
    });
    res.status(201).json({ data: c });
  } catch (err) {
    console.error('[caficultores] POST /', err);
    res.status(500).json({ error: 'Error al crear caficultor' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const exists = await prisma.caficultor.findUnique({ where: { id: req.params.id } });
    if (!exists) return res.status(404).json({ error: 'Caficultor no encontrado' });
    const {
      nombre,
      region,
      altitud,
      variedad,
      foto,
      contacto,
      bio,
      acuerdoPrecioKg,
      modalidad,
      fairTrade,
      notas,
      isActive,
      tipoCataIds,
    } = req.body;
    const updated = await prisma.caficultor.update({
      where: { id: req.params.id },
      data: {
        nombre: nombre?.trim() ?? exists.nombre,
        region: region?.trim() ?? exists.region,
        altitud: altitud != null ? parseInt(altitud) : exists.altitud,
        variedad: variedad?.trim() ?? exists.variedad,
        foto: foto?.trim() ?? exists.foto,
        contacto: contacto?.trim() ?? exists.contacto,
        bio: bio?.trim() ?? exists.bio,
        acuerdoPrecioKg:
          acuerdoPrecioKg != null ? parseFloat(acuerdoPrecioKg) : exists.acuerdoPrecioKg,
        modalidad: modalidad ?? exists.modalidad,
        fairTrade:
          fairTrade !== undefined ? fairTrade === true || fairTrade === 'true' : exists.fairTrade,
        notas: notas?.trim() ?? exists.notas,
        isActive:
          isActive !== undefined ? isActive === true || isActive === 'true' : exists.isActive,
        tiposCata:
          tipoCataIds !== undefined
            ? { set: tipoCataIds.map((id: string) => ({ id })) }
            : undefined,
      },
    });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'UPDATE',
      entity: 'Caficultor',
      entityId: exists.id,
      metadata: { nombre: exists.nombre },
    });
    res.json({ data: updated });
  } catch (err) {
    console.error('[caficultores] PUT /:id', err);
    res.status(500).json({ error: 'Error al actualizar caficultor' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const c = await prisma.caficultor.findUnique({
      where: { id: req.params.id },
      include: { _count: { select: { lotes: true } } },
    });
    if (!c) return res.status(404).json({ error: 'Caficultor no encontrado' });
    if (c._count.lotes > 0) {
      return res
        .status(400)
        .json({ error: 'No se puede eliminar un caficultor con lotes registrados' });
    }
    await prisma.caficultor.delete({ where: { id: req.params.id } });
    await logAdminAction({
      adminId: req.admin?.id,
      action: 'DELETE',
      entity: 'Caficultor',
      entityId: c.id,
      metadata: { nombre: c.nombre },
    });
    res.json({ data: { deleted: true } });
  } catch (err) {
    console.error('[caficultores] DELETE /:id', err);
    res.status(500).json({ error: 'Error al eliminar caficultor' });
  }
});

export default router;
