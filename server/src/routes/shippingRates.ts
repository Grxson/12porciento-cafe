import { Router, Request, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';
import { normalizeState, calculateShipping } from '../lib/shipping';

const router = Router();

router.get('/', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const rates = await prisma.shippingRate.findMany({ orderBy: { state: 'asc' } });
    res.json({ data: rates });
  } catch {
    res.status(500).json({ error: 'Error al obtener tarifas de envío' });
  }
});

// Public: quote shipping cost for a given state during checkout.
// Kept above the /:id routes so an admin later adding GET /:id can't
// accidentally shadow this with req.params.id === 'quote'.
router.get('/quote', async (req: Request, res: Response) => {
  try {
    const state = (req.query.state as string) || '';
    const quote = await calculateShipping(state);
    res.json({ data: quote });
  } catch {
    res.status(500).json({ error: 'Error al calcular envío' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { state, cost, estimatedDays } = req.body;
    if (!state || typeof state !== 'string' || state.trim().length < 2) {
      res.status(400).json({ error: 'Estado requerido' });
      return;
    }
    const costNum = Number(cost);
    if (!Number.isFinite(costNum) || costNum < 0) {
      res.status(400).json({ error: 'Costo debe ser un número mayor o igual a 0' });
      return;
    }
    const rate = await prisma.shippingRate.create({
      data: {
        state: normalizeState(state),
        cost: costNum,
        ...(estimatedDays ? { estimatedDays: String(estimatedDays).slice(0, 100) } : {}),
      },
    });
    res.status(201).json({ data: rate });
  } catch (e: unknown) {
    const prismaErr = e as { code?: string };
    if (prismaErr.code === 'P2002') {
      res.status(409).json({ error: 'Ya existe una tarifa para ese estado' });
      return;
    }
    res.status(500).json({ error: 'Error al crear tarifa' });
  }
});

router.put('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { cost, estimatedDays, isActive } = req.body;
    const data: { cost?: number; estimatedDays?: string; isActive?: boolean } = {};
    if (cost !== undefined) {
      const costNum = Number(cost);
      if (!Number.isFinite(costNum) || costNum < 0) {
        res.status(400).json({ error: 'Costo debe ser un número mayor o igual a 0' });
        return;
      }
      data.cost = costNum;
    }
    if (estimatedDays !== undefined) data.estimatedDays = String(estimatedDays).slice(0, 100);
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const rate = await prisma.shippingRate.update({ where: { id: req.params.id }, data });
    res.json({ data: rate });
  } catch (e: unknown) {
    const prismaErr = e as { code?: string };
    if (prismaErr.code === 'P2025') {
      res.status(404).json({ error: 'No encontrado' });
      return;
    }
    res.status(500).json({ error: 'Error al actualizar tarifa' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rate = await prisma.shippingRate.findUnique({ where: { id: req.params.id } });
    if (rate?.state === 'DEFAULT') {
      res.status(400).json({ error: 'No se puede eliminar la tarifa DEFAULT' });
      return;
    }
    await prisma.shippingRate.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Error al eliminar tarifa' });
  }
});

export default router;
