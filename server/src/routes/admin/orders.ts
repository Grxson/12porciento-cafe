import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../../middleware/auth';
import { prisma } from '../../db';

const router = Router();

// GET /api/admin/orders/logistics — logistics dashboard
router.get('/logistics', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = 30;

    const where: any = {};
    if (statusFilter) where.status = statusFilter;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: { NOT: { status: 'CANCELLED' }, ...where },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          items: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.order.count({ where: { NOT: { status: 'CANCELLED' }, ...where } }),
    ]);

    // Group by status for counts
    const statusCounts = await prisma.order.groupBy({
      by: ['status'],
      _count: true,
    });

    res.json({
      data: orders,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      statusCounts: statusCounts.reduce((acc, s) => ({ ...acc, [s.status]: s._count }), {} as Record<string, number>),
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// PATCH /api/admin/orders/:id/status — update order status
router.patch('/:id/status', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const validStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status },
      include: { user: { select: { id: true, name: true, email: true } }, items: true },
    });
    res.json({ data: order });
  } catch {
    res.status(500).json({ error: 'Error al actualizar estado' });
  }
});

export default router;
