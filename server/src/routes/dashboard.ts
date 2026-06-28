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

    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(now.getDate() - 30);
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

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
      subscriptionRevenueAgg,
      newUsersThisMonth,
      totalUsers,
      topProductsRaw,
      ordersLast30Days,
      ordersLast12Months,
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
      prisma.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED' } }),
      prisma.user.count({ where: { createdAt: { gte: startOfMonth } } }),
      prisma.user.count(),
      prisma.orderItem.groupBy({ by: ['productId'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
      prisma.order.findMany({ where: { createdAt: { gte: thirtyDaysAgo } }, select: { total: true, createdAt: true } }),
      prisma.order.findMany({ where: { createdAt: { gte: twelveMonthsAgo } }, select: { total: true, createdAt: true } }),
    ]);

    const totalRevenue = revenueAggregate._sum.total ?? 0;
    const revenueThisMonth = revenueMonthAggregate._sum.total ?? 0;
    const subscriptionRevenue = subscriptionRevenueAgg._sum.amount ?? 0;
    const conversionRate = totalUsers > 0 ? parseFloat(((totalOrders / totalUsers) * 100).toFixed(1)) : 0;

    // Revenue by month (last 12 months, fill gaps with 0)
    const revenueByMonthMap = new Map<string, number>();
    for (const order of ordersLast12Months) {
      const key = `${order.createdAt.getFullYear()}-${order.createdAt.getMonth()}`;
      revenueByMonthMap.set(key, (revenueByMonthMap.get(key) || 0) + (order.total ?? 0));
    }
    const revenueByMonth: { month: number; year: number; total: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      revenueByMonth.push({ month: d.getMonth(), year: d.getFullYear(), total: revenueByMonthMap.get(key) || 0 });
    }

    // Orders by day (last 30 days, fill gaps with 0)
    const ordersByDayMap = new Map<string, { count: number; revenue: number }>();
    for (const order of ordersLast30Days) {
      const dateStr = order.createdAt.toISOString().split('T')[0];
      const entry = ordersByDayMap.get(dateStr) || { count: 0, revenue: 0 };
      entry.count++;
      entry.revenue += order.total ?? 0;
      ordersByDayMap.set(dateStr, entry);
    }
    const ordersByDay: { date: string; count: number; revenue: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const entry = ordersByDayMap.get(dateStr) || { count: 0, revenue: 0 };
      ordersByDay.push({ date: dateStr, count: entry.count, revenue: entry.revenue });
    }

    // Top products by order quantity
    const productIds = topProductsRaw.map(p => p.productId);
    const products = productIds.length > 0 ? await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, price: true },
    }) : [];
    const productMap = new Map(products.map(p => [p.id, p]));
    const topProducts = topProductsRaw.map(p => {
      const product = productMap.get(p.productId);
      return {
        name: product?.name ?? 'Desconocido',
        quantity: p._sum.quantity ?? 0,
        revenue: (p._sum.quantity ?? 0) * (product?.price ?? 0),
      };
    });

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
      revenueByMonth,
      ordersByDay,
      topProducts,
      subscriptionRevenue,
      newUsersThisMonth,
      conversionRate,
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

export default router;
