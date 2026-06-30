import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { logAdminAction } from '../lib/adminLog';

const router = Router();

router.get('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const versions = await prisma.productVersion.findMany({
      where: { productId: req.params.productId },
      include: { caficultor: { select: { id: true, nombre: true, region: true } } },
      orderBy: { version: 'desc' },
    });
    res.json({ data: versions });
  } catch (err) {
    console.error('[product-versions] GET /:productId', err);
    res.status(500).json({ error: 'Error al obtener versiones' });
  }
});

router.post('/:productId', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cosecha, caficultorId, loteId, scoreFinal, notasSabor } = req.body;

    const lastVersion = await prisma.productVersion.findFirst({
      where: { productId: req.params.productId },
      orderBy: { version: 'desc' },
    });
    const nextVersion = (lastVersion?.version ?? 0) + 1;

    await prisma.productVersion.updateMany({
      where: { productId: req.params.productId, isActive: true },
      data: { isActive: false },
    });

    const version = await prisma.productVersion.create({
      data: {
        productId: req.params.productId,
        version: nextVersion,
        cosecha: cosecha?.trim() || null,
        caficultorId: caficultorId || null,
        loteId: loteId || null,
        scoreFinal: scoreFinal ? parseFloat(scoreFinal) : null,
        notasSabor: notasSabor?.trim() || null,
        isActive: true,
      },
      include: { caficultor: { select: { id: true, nombre: true, region: true } } },
    });

    await logAdminAction({
      adminId: req.admin?.id,
      action: 'CREATE',
      entity: 'ProductVersion',
      entityId: version.id,
      metadata: { productId: req.params.productId, version: nextVersion, cosecha },
    });

    res.status(201).json({ data: version });
  } catch (err) {
    console.error('[product-versions] POST /:productId', err);
    res.status(500).json({ error: 'Error al crear versión' });
  }
});

export default router;
