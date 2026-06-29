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

router.get('/financial', requireAuth, async (_req: AuthRequest, res: Response) => {
  try {
    const now = new Date();
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1);
    const startLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth   = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
    const startOfWeek    = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
    const startLastWeek  = new Date(startOfWeek); startLastWeek.setDate(startLastWeek.getDate() - 7);
    const endLastWeek    = new Date(startOfWeek); endLastWeek.setMilliseconds(-1);
    const sixMonthsAgo   = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      revTotal,
      revThisMonth,
      revLastMonth,
      revThisWeek,
      revLastWeek,
      mrrThisMonth,
      mrrLastMonth,
      ordersByStatus,
      orderItemsRaw,
      revLast6Months,
    ] = await Promise.all([
      prisma.order.aggregate({ _sum: { total: true } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfMonth } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startOfWeek } } }),
      prisma.order.aggregate({ _sum: { total: true }, where: { createdAt: { gte: startLastWeek, lte: endLastWeek } } }),
      prisma.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED', billingDate: { gte: startOfMonth } } }),
      prisma.subscriptionPayment.aggregate({ _sum: { amount: true }, where: { status: 'SUCCEEDED', billingDate: { gte: startLastMonth, lte: endLastMonth } } }),
      prisma.order.groupBy({ by: ['status'], _count: { id: true }, _sum: { total: true } }),
      prisma.orderItem.findMany({
        where: { order: { createdAt: { gte: sixMonthsAgo } } },
        include: { product: { select: { costPrice: true, category: true, name: true } } },
      }),
      prisma.order.findMany({ where: { createdAt: { gte: sixMonthsAgo } }, select: { total: true, createdAt: true } }),
    ]);

    // Cost + profit (from order items with known costPrice)
    let totalCostKnown = 0;
    let totalRevKnown = 0;
    const categoryMap = new Map<string, number>();
    const productRevenueMap = new Map<string, { name: string; revenue: number; units: number }>();

    for (const item of orderItemsRaw) {
      const itemRevenue = item.price * item.quantity;
      const category = item.product.category ?? 'Sin categoría';
      categoryMap.set(category, (categoryMap.get(category) ?? 0) + itemRevenue);

      const productName = item.product.name ?? item.productId;
      const existing = productRevenueMap.get(item.productId) ?? { name: productName, revenue: 0, units: 0 };
      existing.revenue += itemRevenue;
      existing.units   += item.quantity;
      productRevenueMap.set(item.productId, existing);

      if (item.product.costPrice != null) {
        totalCostKnown  += item.product.costPrice * item.quantity;
        totalRevKnown   += itemRevenue;
      }
    }

    const profitKnown  = totalRevKnown - totalCostKnown;
    const marginKnown  = totalRevKnown > 0 ? parseFloat(((profitKnown / totalRevKnown) * 100).toFixed(1)) : null;

    // Revenue by category (sorted desc)
    const revenueByCategory = Array.from(categoryMap.entries())
      .map(([category, revenue]) => ({ category, revenue: parseFloat(revenue.toFixed(2)) }))
      .sort((a, b) => b.revenue - a.revenue);

    // Top 5 products by revenue
    const topRevenueProducts = Array.from(productRevenueMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5)
      .map((p) => ({ ...p, revenue: parseFloat(p.revenue.toFixed(2)) }));

    // Revenue by month (last 6 months)
    const monthMap = new Map<string, number>();
    for (const order of revLast6Months) {
      const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + (order.total ?? 0));
    }
    const revenueByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      revenueByMonth.push({ key, month: d.getMonth(), year: d.getFullYear(), total: parseFloat((monthMap.get(key) ?? 0).toFixed(2)) });
    }

    // Order status breakdown
    const statusBreakdown = ordersByStatus.reduce((acc, s) => ({
      ...acc,
      [s.status]: { count: s._count.id, revenue: parseFloat((s._sum.total ?? 0).toFixed(2)) },
    }), {} as Record<string, { count: number; revenue: number }>);

    const mrr     = parseFloat((mrrThisMonth._sum.amount ?? 0).toFixed(2));
    const mrrLast = parseFloat((mrrLastMonth._sum.amount ?? 0).toFixed(2));

    res.json({
      revenue: {
        total:      parseFloat((revTotal._sum.total ?? 0).toFixed(2)),
        thisMonth:  parseFloat((revThisMonth._sum.total ?? 0).toFixed(2)),
        lastMonth:  parseFloat((revLastMonth._sum.total ?? 0).toFixed(2)),
        thisWeek:   parseFloat((revThisWeek._sum.total ?? 0).toFixed(2)),
        lastWeek:   parseFloat((revLastWeek._sum.total ?? 0).toFixed(2)),
      },
      cost: {
        known:     parseFloat(totalCostKnown.toFixed(2)),
        coverage:  orderItemsRaw.length > 0
          ? parseFloat(((orderItemsRaw.filter(i => i.product.costPrice != null).length / orderItemsRaw.length) * 100).toFixed(1))
          : 0,
      },
      profit: {
        known:     parseFloat(profitKnown.toFixed(2)),
        margin:    marginKnown,
      },
      mrr: { current: mrr, lastMonth: mrrLast },
      revenueByMonth,
      revenueByCategory,
      topRevenueProducts,
      statusBreakdown,
    });
  } catch (error) {
    console.error('[financial] Error:', error);
    res.status(500).json({ error: 'Error al obtener datos financieros' });
  }
});

export default router;
