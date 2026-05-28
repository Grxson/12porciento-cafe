import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, plan, frequency = 'monthly' } = req.body;

    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + (frequency === 'bimonthly' ? 2 : 1));

    const existing = await prisma.subscription.findUnique({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'Ya existe una suscripción con este email' });
      return;
    }

    const subscription = await prisma.subscription.create({
      data: { name, email, phone, plan, frequency, nextBilling },
    });
    res.status(201).json(subscription);
  } catch {
    res.status(500).json({ error: 'Error al crear suscripción' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const subscriptions = await prisma.subscription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    res.json(subscriptions);
  } catch {
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

router.put('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['ACTIVE', 'PAUSED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Estado inválido' });
      return;
    }
    const sub = await prisma.subscription.update({
      where: { id: req.params.id },
      data: { status },
    });
    res.json(sub);
  } catch {
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

export default router;
