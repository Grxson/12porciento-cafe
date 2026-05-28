import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

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
      allOrders,
      activeSubscriptions,
      totalProducts,
      lowStockProducts,
      recentOrders,
      pendingReviews,
    ] = await Promise.all([
      prisma.order.count(),
      prisma.order.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.count({ where: { createdAt: { gte: startOfWeek } } }),
      prisma.order.findMany({ select: { total: true } }),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.product.count({ where: { isActive: true } }),
      prisma.product.findMany({ where: { stock: { lte: 10 }, isActive: true }, select: { name: true, stock: true } }),
      prisma.order.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { items: { include: { product: { select: { name: true } } } } },
      }),
      prisma.review.count({ where: { isApproved: false } }),
    ]);

    const totalRevenue = allOrders.reduce((sum, o) => sum + o.total, 0);
    const monthOrders = await prisma.order.findMany({
      where: { createdAt: { gte: startOfMonth } },
      select: { total: true },
    });
    const revenueThisMonth = monthOrders.reduce((sum, o) => sum + o.total, 0);

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
    });
  } catch {
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
