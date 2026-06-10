import { Router, Response } from 'express';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { prisma } from '../db';

const router = Router();

router.get('/stats', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());

    const [
      totalOrders,
      ordersThisMonth,
      ordersThisWeek,
      revenueAggregate,
      revenueMonthAggregate,
      activeSubscriptions,
      totalProducts,
      lowStockProducts,
      recentOrders,
      pendingReviews,
      totalBrews,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfMonth } } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({ where: { stock: { lte: 10 }, isActive: true }, select: { name: true, stock: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: { select: { name: true } } } } },
      }),
      prisma.review.count({ where: { isApproved: false } }),
      prisma.brewLog.count(),
    ]);

    const totalRevenue = revenueAggregate._sum.total ?? 0;
    const revenueThisMonth = revenueMonthAggregate._sum.total ?? 0;

    res.json({
      totalOrders,
      ordersThisMonth,
      ordersThisWeek,
      totalRevenue,
      revenueThisMonth,
      activeSubscriptions,
      totalProducts,
      lowStockProducts,
      recentOrders,
      pendingReviews,
      totalBrews,
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
