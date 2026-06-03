import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const codes = await prisma.promoCode.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ data: codes });
  } catch {
    res.status(500).json({ error: 'Error al obtener códigos' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { code, discount, type, maxUses, expiresAt } = req.body;
    if (!code || discount == null) {
      res.status(400).json({ error: 'Código y descuento son requeridos' });
      return;
    }
    const promo = await prisma.promoCode.create({
      data: {
        code: (code as string).toUpperCase(),
        discount: parseFloat(discount),
        type: type ?? 'PERCENT',
        maxUses: maxUses ? parseInt(maxUses) : null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    });
    res.status(201).json({ data: promo });
  } catch (e: any) {
    if (e.code === 'P2002') {
      res.status(409).json({ error: 'Ese código ya existe' });
      return;
    }
    res.status(500).json({ error: 'Error al crear código' });
  }
});

router.put('/:id/toggle', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id: req.params.id } });
    if (!promo) { res.status(404).json({ error: 'No encontrado' }); return; }
    const updated = await prisma.promoCode.update({
      where: { id: req.params.id },
      data: { isActive: !promo.isActive },
    });
    res.json({ data: updated });
  } catch {
    res.status(500).json({ error: 'Error al actualizar código' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await prisma.promoCode.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar código' });
  }
});

router.post('/validate', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const promo = await prisma.promoCode.findUnique({ where: { code: (code as string)?.toUpperCase() } });

    if (!promo || !promo.isActive) {
      res.status(404).json({ error: 'Código inválido o inactivo' });
      return;
    }
    if (promo.expiresAt && new Date() > promo.expiresAt) {
      res.status(400).json({ error: 'Código expirado' });
      return;
    }
    if (promo.maxUses && promo.usedCount >= promo.maxUses) {
      res.status(400).json({ error: 'Código agotado' });
      return;
    }

    res.json({ data: { discount: promo.discount, type: promo.type, code: promo.code } });
  } catch {
    res.status(500).json({ error: 'Error al validar código' });
  }
});

export default router;
