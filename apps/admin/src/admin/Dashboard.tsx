import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  Star,
  AlertTriangle,
  ArrowUpRight,
  Package,
  Gift,
  Tag,
  Plus,
  Coffee,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { dashboardApi, baristaApi, adminApi, inventoryApi } from '../api';
import { PageMeta } from '../hooks/usePageMeta';
import type { DashboardStats, FinancialData } from '../types';

interface ChartColors {
  grid: string;
  text: string;
  gold: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>({
    grid: '#2c1810',
    text: '#a05a2c',
    gold: '#c9a96e',
    tooltipBg: '#1a0f0a',
    tooltipBorder: '#2c1810',
    tooltipText: '#e8d5b7',
  });
  useEffect(() => {
    const root = document.documentElement;
    const computed = getComputedStyle(root);
    const update = () => {
      const isDark = root.classList.contains('dark');
      setColors({
        grid: isDark ? '#2c1810' : computed.getPropertyValue('--chart-grid').trim() || '#e8d5c4',
        text: isDark ? '#a05a2c' : computed.getPropertyValue('--chart-text').trim() || '#8b5a2b',
        gold: '#c9a96e',
        tooltipBg: isDark
          ? '#1a0f0a'
          : computed.getPropertyValue('--chart-tooltip-bg').trim() || '#ffffff',
        tooltipBorder: isDark
          ? '#2c1810'
          : computed.getPropertyValue('--chart-tooltip-border').trim() || '#e8d5c4',
        tooltipText: isDark
          ? '#e8d5b7'
          : computed.getPropertyValue('--chart-tooltip-text').trim() || '#4a3728',
      });
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);
  return colors;
}

const statusConfig: Record<string, { label: string; color: string; hex: string }> = {
  PENDING: { label: 'Pendiente', color: 'text-yellow-700 dark:text-yellow-400', hex: '#eab308' },
  PROCESSING: { label: 'Procesando', color: 'text-blue-700 dark:text-blue-400', hex: '#3b82f6' },
  SHIPPED: { label: 'Enviado', color: 'text-purple-700 dark:text-purple-400', hex: '#a855f7' },
  DELIVERED: { label: 'Entregado', color: 'text-green-600 dark:text-green-400', hex: '#22c55e' },
  CANCELLED: { label: 'Cancelado', color: 'text-red-600 dark:text-red-400', hex: '#ef4444' },
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [topBaristas, setTopBaristas] = useState<
    {
      userId: string;
      level: number;
      totalXp: number;
      totalBrews: number;
      user: { id: string; name: string };
    }[]
  >([]);
  const [financial, setFinancial] = useState<FinancialData | null>(null);
  const [inventorySummary, setInventorySummary] = useState<{
    totalSKUs: number;
    activeSKUs: number;
    totalUnits: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  } | null>(null);
  const chartColors = useChartColors();

  useEffect(() => {
    dashboardApi
      .stats()
      .then((r) => {
        setStats(r.data);
      })
      .catch((e) => {
        console.error(e);
        setStatsError('Error al cargar estadísticas.');
      })
      .finally(() => setLoading(false));
    adminApi
      .financial()
      .then((r) => setFinancial(r.data))
      .catch((e) => console.error('[financial]', e));
    inventoryApi
      .overview()
      .then((r) => setInventorySummary(r.data.summary))
      .catch((e) => console.error('[inventory]', e));
  }, []);

  useEffect(() => {
    baristaApi
      .getLeaderboard(10)
      .then((res) => setTopBaristas(res.data.data))
      .catch(console.error);
  }, []);

  const revenueData = useMemo(() => {
    if (!stats?.revenueByMonth) return [];
    return stats.revenueByMonth.map((r) => ({
      mes: MONTHS[r.month],
      ingresos: r.total,
    }));
  }, [stats]);

  const ordersByDayData = useMemo(() => {
    if (!stats?.ordersByDay) return [];
    return stats.ordersByDay.slice(-14).map((d) => ({
      dia: new Date(d.date + 'T12:00:00').toLocaleDateString('es-MX', {
        weekday: 'short',
        day: 'numeric',
      }),
      pedidos: d.count,
      ingresos: d.revenue,
    }));
  }, [stats]);

  const statusPieData = useMemo(() => {
    if (!financial?.statusBreakdown) return [];
    return Object.entries(financial.statusBreakdown).map(([status, data]) => ({
      name: statusConfig[status]?.label ?? status,
      value: data.count,
      revenue: data.revenue,
      hex: statusConfig[status]?.hex ?? '#8884d8',
    }));
  }, [financial]);

  const categoryPieData = useMemo(() => {
    if (!financial?.revenueByCategory) return [];
    const palette = ['#c9a96e', '#8b5a2b', '#d4a76a', '#6b3a1f', '#e8d5b7', '#a05a2c', '#4a3728'];
    return financial.revenueByCategory.map((cat, i) => ({
      name: cat.category,
      value: cat.revenue,
      fill: palette[i % palette.length],
    }));
  }, [financial]);

  const revenueMonthBarData = useMemo(() => {
    if (!financial?.revenueByMonth) return [];
    return financial.revenueByMonth.map((m) => ({
      mes: MONTHS[m.month],
      ingresos: m.total,
    }));
  }, [financial]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (statsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-red-400">{statsError}</p>
        <button
          onClick={() => {
            setStatsError(null);
            setLoading(true);
            dashboardApi
              .stats()
              .then((r) => setStats(r.data))
              .catch((e) => {
                console.error(e);
                setStatsError('Error al cargar estadísticas.');
              })
              .finally(() => setLoading(false));
          }}
          className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    {
      label: 'Ingresos totales',
      value: `$${stats.totalRevenue.toLocaleString('es-MX')}`,
      sub: `$${stats.revenueThisMonth.toLocaleString('es-MX')} este mes`,
      icon: TrendingUp,
      trend: '+12%',
      accent: false,
    },
    {
      label: 'Pedidos totales',
      value: stats.totalOrders,
      sub: `${stats.ordersThisWeek} esta semana`,
      icon: ShoppingBag,
      trend: `+${stats.ordersThisMonth} mes`,
      accent: false,
    },
    {
      label: 'Suscriptores activos',
      value: stats.activeSubscriptions,
      sub: 'Suscripciones vigentes',
      icon: Users,
      trend: null,
      accent: false,
    },
    {
      label: 'Reseñas pendientes',
      value: stats.pendingReviews ?? 0,
      sub: `${stats.lowStockProducts.length} productos bajo stock`,
      icon: Star,
      trend: null,
      accent: (stats.pendingReviews ?? 0) > 0,
    },
    {
      label: 'Brews registrados',
      value: stats.totalBrews ?? 0,
      sub: 'En el sistema',
      icon: Coffee,
      trend: null,
      accent: false,
    },
    {
      label: 'Ingresos suscrip.',
      value: `$${stats.subscriptionRevenue.toLocaleString('es-MX')}`,
      sub: 'Total acumulado',
      icon: Gift,
      trend: null,
      accent: false,
    },
    {
      label: 'Nuevos usuarios',
      value: stats.newUsersThisMonth,
      sub: 'Registrados este mes',
      icon: Users,
      trend: null,
      accent: false,
    },
    {
      label: 'Tasa conversión',
      value: `${stats.conversionRate}%`,
      sub: 'Pedidos / Usuarios',
      icon: TrendingUp,
      trend: null,
      accent: false,
    },
  ];

  return (
    <div className="space-y-8">
      <PageMeta title="Dashboard" noSuffix />
      <div>
        <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Dashboard</h1>
        <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">
          Resumen general de la operación
        </p>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Link
          to="/productos"
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors"
        >
          <Package size={16} /> Nuevo producto
        </Link>
        <Link
          to="/bundles"
          className="flex items-center gap-2 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors"
        >
          <Gift size={16} /> Nuevo bundle
        </Link>
        <Link
          to="/descuentos"
          className="flex items-center gap-2 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors"
        >
          <Tag size={16} /> Nuevo código
        </Link>
        <Link
          to="/inventario"
          className="flex items-center gap-2 px-4 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors"
        >
          <Plus size={16} /> Ajustar inventario
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-coffee-100 dark:bg-coffee-900 border p-5 transition-colors hover:border-gold-500/30 ${
              card.accent ? 'border-yellow-500/40' : 'border-coffee-200 dark:border-coffee-800'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-widest">
                {card.label}
              </p>
              <card.icon
                className={`w-4 h-4 ${card.accent ? 'text-yellow-500/80' : 'text-gold-500/60'}`}
              />
            </div>
            <p
              className={`font-serif text-3xl font-semibold ${card.accent ? 'text-yellow-600 dark:text-yellow-400' : 'text-coffee-900 dark:text-cream'}`}
            >
              {card.value}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-coffee-500 dark:text-coffee-400 text-xs">{card.sub}</p>
              {card.trend && (
                <span className="flex items-center gap-0.5 text-green-600 dark:text-green-400 text-xs font-medium">
                  <ArrowUpRight className="w-3 h-3" />
                  {card.trend}
                </span>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue trend */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="xl:col-span-2 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">
                Tendencia de ingresos
              </h2>
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">
                Últimos 12 meses
              </p>
            </div>
            <span className="text-gold-500 text-xs tracking-widest uppercase">MXN</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a96e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#c9a96e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: chartColors.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: chartColors.text, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  background: chartColors.tooltipBg,
                  border: `1px solid ${chartColors.tooltipBorder}`,
                  borderRadius: 0,
                }}
                labelStyle={{
                  color: chartColors.gold,
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
                itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                formatter={(v) => [`$${Number(v).toLocaleString('es-MX')}`, 'Ingresos']}
              />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke={chartColors.gold}
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={false}
                activeDot={{ r: 4, fill: chartColors.gold, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Orders by day */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6"
        >
          <div className="mb-6">
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">Pedidos por día</h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">Últimos 14 días</p>
          </div>
          {ordersByDayData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-coffee-500 dark:text-coffee-400 text-sm">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={ordersByDayData} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                <XAxis
                  dataKey="dia"
                  tick={{ fill: chartColors.text, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartColors.text, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{
                    background: chartColors.tooltipBg,
                    border: `1px solid ${chartColors.tooltipBorder}`,
                    borderRadius: 0,
                  }}
                  labelStyle={{
                    color: chartColors.gold,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    letterSpacing: '0.1em',
                  }}
                  itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                  formatter={(v, name) => [v, name === 'pedidos' ? 'Pedidos' : 'Ingresos']}
                />
                <Bar dataKey="pedidos" fill={chartColors.gold} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5">
            Pedidos recientes
          </h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-coffee-500 dark:text-coffee-400 text-sm py-4">No hay pedidos aún.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                >
                  <div>
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                      {order.customerName}
                    </p>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">
                      {order.items.map((i) => i.product?.name ?? 'Producto').join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold-500 text-sm font-semibold">
                      ${order.total.toLocaleString('es-MX')}
                    </p>
                    <p
                      className={`text-xs mt-0.5 ${statusConfig[order.status]?.color ?? 'text-coffee-400'}`}
                    >
                      {statusConfig[order.status]?.label ?? order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5 flex items-center gap-2">
            <Package className="w-4 h-4 text-gold-500/60" />
            Productos más vendidos
          </h2>
          {!stats.topProducts || stats.topProducts.length === 0 ? (
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">Sin datos aún.</p>
          ) : (
            <div className="space-y-3">
              {stats.topProducts.map((product, i) => (
                <div
                  key={product.name}
                  className="flex items-center justify-between py-2.5 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-coffee-500 text-xs w-5 text-right shrink-0">{i + 1}</span>
                    <p className="text-coffee-800 dark:text-coffee-200 text-sm truncate">
                      {product.name}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                      {product.quantity} uds
                    </p>
                    <p className="text-gold-500 text-xs">
                      ${product.revenue.toLocaleString('es-MX')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Barista leaderboard */}
        <div className="xl:col-span-2 bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5 flex items-center gap-2">
            <Coffee className="w-4 h-4 text-gold-500/60" />
            Top Baristas
          </h2>
          {topBaristas.length === 0 ? (
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">
              Sin brews registrados aún.
            </p>
          ) : (
            <div className="space-y-2">
              {topBaristas.map((b, i) => (
                <Link
                  key={b.userId}
                  to={`/perfil/barista/${b.userId}`}
                  className="flex items-center justify-between py-2.5 border-b border-coffee-200 dark:border-coffee-800 last:border-0 hover:bg-coffee-200/50 dark:hover:bg-coffee-800/30 -mx-2 px-2 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-coffee-500 text-xs w-5 text-right">{i + 1}</span>
                    <div>
                      <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                        {b.user.name}
                      </p>
                      <p className="text-coffee-500 text-xs">{b.totalBrews} brews</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-gold-500 text-xs font-semibold">Nv. {b.level}</span>
                    <p className="text-coffee-500 dark:text-coffee-400 text-xs">{b.totalXp} XP</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Bajo stock
          </h2>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">
              Todo el inventario está bien.
            </p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map(({ name, stock }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 border-b border-coffee-200 dark:border-coffee-800 last:border-0"
                >
                  <p className="text-coffee-800 dark:text-coffee-200 text-sm">{name}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 ${
                      stock <= 5
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                    }`}
                  >
                    {stock} uds
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Summary */}
      {inventorySummary && (
        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream flex items-center gap-2">
              <Package className="w-4 h-4 text-gold-500/60" />
              Inventario
            </h2>
            <Link
              to="/inventario"
              className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
            >
              Ver detalle →
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              {
                label: 'SKUs',
                value: inventorySummary.activeSKUs,
                sub: `de ${inventorySummary.totalSKUs}`,
              },
              { label: 'Unidades', value: inventorySummary.totalUnits.toLocaleString('es-MX') },
              { label: 'Valor', value: `$${inventorySummary.totalValue.toLocaleString('es-MX')}` },
              {
                label: 'Stock bajo',
                value: inventorySummary.lowStockCount,
                alert: inventorySummary.lowStockCount > 0,
              },
              {
                label: 'Sin stock',
                value: inventorySummary.outOfStockCount,
                alert: inventorySummary.outOfStockCount > 0,
              },
            ].map((item) => (
              <div
                key={item.label}
                className={`border p-3 ${item.alert ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-500/30' : 'border-coffee-200 dark:border-coffee-800'}`}
              >
                <p className="text-coffee-500 dark:text-coffee-400 text-xs uppercase tracking-widest mb-1">
                  {item.label}
                </p>
                <p
                  className={`font-serif text-xl font-bold ${item.alert ? 'text-yellow-600 dark:text-yellow-400' : 'text-coffee-900 dark:text-cream'}`}
                >
                  {item.value}
                </p>
                {item.sub && <p className="text-coffee-500 text-xs mt-0.5">{item.sub}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Financial Overview — only when data loaded */}
      {financial && (
        <div className="space-y-6">
          <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream border-t border-coffee-200 dark:border-coffee-800 pt-6 mt-2">
            Panorama Financiero
          </h2>

          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-4">
            {[
              {
                label: 'Utilidad conocida',
                value: `$${financial.profit.known.toLocaleString('es-MX')}`,
                accent: financial.profit.margin && financial.profit.margin > 20,
              },
              {
                label: 'Margen',
                value: financial.profit.margin != null ? `${financial.profit.margin}%` : '—',
                accent: financial.profit.margin != null && financial.profit.margin > 20,
              },
              {
                label: 'MRR (este mes)',
                value: `$${financial.mrr.current.toLocaleString('es-MX')}`,
                accent: financial.mrr.current > financial.mrr.lastMonth,
              },
              {
                label: 'MRR (mes ant.)',
                value: `$${financial.mrr.lastMonth.toLocaleString('es-MX')}`,
                accent: false,
              },
              {
                label: 'Costo conocido',
                value: `$${financial.cost.known.toLocaleString('es-MX')}`,
                accent: false,
              },
              {
                label: 'Cobertura costos',
                value: `${financial.cost.coverage}%`,
                accent: financial.cost.coverage > 80,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className={`bg-coffee-100 dark:bg-coffee-900 border p-4 ${kpi.accent ? 'border-green-500/40' : 'border-coffee-200 dark:border-coffee-800'}`}
              >
                <p className="text-coffee-600 dark:text-coffee-400 text-xs uppercase tracking-widest mb-2">
                  {kpi.label}
                </p>
                <p
                  className={`font-serif text-xl font-semibold ${kpi.accent ? 'text-green-600 dark:text-green-400' : 'text-coffee-900 dark:text-cream'}`}
                >
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {/* Order Status Pie + Category Pie row */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Order Status Donut */}
            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
              <h3 className="font-serif text-lg text-coffee-900 dark:text-cream mb-4">
                Estado de pedidos
              </h3>
              {statusPieData.length === 0 ? (
                <p className="text-coffee-500 dark:text-coffee-400 text-sm">Sin datos aún.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={statusPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {statusPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.hex} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: 0,
                      }}
                      labelStyle={{ color: chartColors.gold, fontSize: 11 }}
                      itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                      formatter={(value) => [`${value} pedidos`, 'Pedidos']}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: chartColors.text }}
                      formatter={(value) => (
                        <span style={{ color: chartColors.tooltipText, fontSize: 11 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Revenue by Category Pie */}
            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
              <h3 className="font-serif text-lg text-coffee-900 dark:text-cream mb-4">
                Ingresos por categoría
              </h3>
              {categoryPieData.length === 0 ? (
                <p className="text-coffee-500 dark:text-coffee-400 text-sm">Sin datos aún.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={90}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {categoryPieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: chartColors.tooltipBg,
                        border: `1px solid ${chartColors.tooltipBorder}`,
                        borderRadius: 0,
                      }}
                      labelStyle={{ color: chartColors.gold, fontSize: 11 }}
                      itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                      formatter={(value) => [
                        `$${Number(value).toLocaleString('es-MX')}`,
                        'Ingresos',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 11, color: chartColors.text }}
                      formatter={(value) => (
                        <span style={{ color: chartColors.tooltipText, fontSize: 11 }}>
                          {value}
                        </span>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Top products by revenue — horizontal bar chart */}
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
            <h3 className="font-serif text-lg text-coffee-900 dark:text-cream mb-4">
              Top ingresos por producto
            </h3>
            {financial.topRevenueProducts.length === 0 ? (
              <p className="text-coffee-500 dark:text-coffee-400 text-sm">Sin datos aún.</p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={Math.max(200, financial.topRevenueProducts.length * 36)}
              >
                <BarChart
                  data={financial.topRevenueProducts}
                  layout="vertical"
                  margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={chartColors.grid}
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={160}
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: 0,
                    }}
                    labelStyle={{
                      color: chartColors.gold,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                    itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                    formatter={(v, _name, props) => [
                      `$${Number(v).toLocaleString('es-MX')} · ${props.payload.units} uds`,
                      'Ingresos',
                    ]}
                  />
                  <Bar dataKey="revenue" fill={chartColors.gold} radius={[0, 2, 2, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Revenue by month bar chart (last 6 months) */}
          {revenueMonthBarData.length > 0 && (
            <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6">
              <h3 className="font-serif text-lg text-coffee-900 dark:text-cream mb-4">
                Tendencia ingresos (6 meses)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={revenueMonthBarData}
                  margin={{ top: 4, right: 4, left: -16, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                  <XAxis
                    dataKey="mes"
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: chartColors.text, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: chartColors.tooltipBg,
                      border: `1px solid ${chartColors.tooltipBorder}`,
                      borderRadius: 0,
                    }}
                    labelStyle={{
                      color: chartColors.gold,
                      fontSize: 11,
                      textTransform: 'uppercase',
                      letterSpacing: '0.1em',
                    }}
                    itemStyle={{ color: chartColors.tooltipText, fontSize: 12 }}
                    formatter={(v) => [`$${Number(v).toLocaleString('es-MX')}`, 'Ingresos']}
                  />
                  <Bar dataKey="ingresos" fill={chartColors.gold} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
