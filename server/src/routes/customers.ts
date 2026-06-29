import { Router, Response } from 'express';
import { Prisma } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { search, page, pageSize } = req.query;
    const where: Prisma.UserWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { email: { contains: search as string } },
      ];
    }

    const psRaw = parseInt(pageSize as string);
    const ps = Number.isInteger(psRaw) ? Math.min(Math.max(psRaw, 1), 100) : 20;
    const pgRaw = parseInt(page as string);
    const pg = Number.isInteger(pgRaw) ? Math.max(pgRaw - 1, 0) : 0;

    const [users, total] = await prisma.$transaction([
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true,
          city: true, state: true, createdAt: true,
          _count: { select: { orders: true, subscriptions: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: ps,
        skip: pg * ps,
      }),
      prisma.user.count({ where }),
    ]);
    res.json({ data: users, total, page: pg + 1, pageSize: ps, totalPages: Math.ceil(total / ps) });
  } catch {
    res.status(500).json({ error: 'Error al obtener clientes' });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        orders: {
          include: { items: { include: { product: { select: { name: true } } } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        subscriptions: { orderBy: { createdAt: 'desc' }, take: 5 },
        reviews: {
          include: { product: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: { select: { orders: true, subscriptions: true } },
      },
    });
    if (!user) { res.status(404).json({ error: 'Cliente no encontrado' }); return; }
    const { password: _password, ...safeUser } = user;
    res.json({ data: safeUser });
  } catch {
    res.status(500).json({ error: 'Error al obtener cliente' });
  }
});

export default router;
