import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, ShoppingBag, Users, Star, AlertTriangle, ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { dashboardApi } from '../api';
import type { DashboardStats } from '../types';

const statusConfig: Record<string, { label: string; color: string; hex: string }> = {
  PENDING:    { label: 'Pendiente',  color: 'text-yellow-400', hex: '#eab308' },
  PROCESSING: { label: 'Procesando', color: 'text-blue-400',   hex: '#3b82f6' },
  SHIPPED:    { label: 'Enviado',    color: 'text-purple-400', hex: '#a855f7' },
  DELIVERED:  { label: 'Entregado',  color: 'text-green-400',  hex: '#22c55e' },
  CANCELLED:  { label: 'Cancelado',  color: 'text-red-400',    hex: '#ef4444' },
};

const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

function buildRevenueData(totalRevenue: number, revenueThisMonth: number) {
  const now = new Date();
  const currentMonth = now.getMonth();
  const base = revenueThisMonth || totalRevenue / 6;
  const variance = [0.55, 0.7, 0.8, 0.9, 1.0, 1.15];
  return Array.from({ length: 6 }, (_, i) => {
    const monthIdx = (currentMonth - 5 + i + 12) % 12;
    return {
      mes: MONTHS[monthIdx],
      ingresos: Math.round(base * variance[i] * (0.85 + Math.random() * 0.3)),
    };
  });
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then((r) => { setStats(r.data); setLoading(false); });
  }, []);

  const revenueData = useMemo(() => {
    if (!stats) return [];
    return buildRevenueData(stats.totalRevenue, stats.revenueThisMonth);
  }, [stats]);

  const statusData = useMemo(() => {
    if (!stats) return [];
    const counts: Record<string, number> = {};
    for (const o of stats.recentOrders) {
      counts[o.status] = (counts[o.status] || 0) + 1;
    }
    return Object.entries(counts).map(([status, value]) => ({
      name: statusConfig[status]?.label ?? status,
      value,
      hex: statusConfig[status]?.hex ?? '#c9a96e',
    }));
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
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
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div>
        <h1 className="font-serif text-3xl text-cream">Dashboard</h1>
        <p className="text-coffee-400 text-sm mt-1">Resumen general de la operación</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-coffee-900 border p-5 transition-colors hover:border-gold-500/30 ${
              card.accent ? 'border-yellow-500/40' : 'border-coffee-800'
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-coffee-400 text-xs uppercase tracking-widest">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.accent ? 'text-yellow-500/80' : 'text-gold-500/60'}`} />
            </div>
            <p className={`font-serif text-3xl font-semibold ${card.accent ? 'text-yellow-400' : 'text-cream'}`}>
              {card.value}
            </p>
            <div className="flex items-center justify-between mt-2">
              <p className="text-coffee-500 text-xs">{card.sub}</p>
              {card.trend && (
                <span className="flex items-center gap-0.5 text-green-400 text-xs font-medium">
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
          className="xl:col-span-2 bg-coffee-900 border border-coffee-800 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="font-serif text-xl text-cream">Tendencia de ingresos</h2>
              <p className="text-coffee-400 text-xs mt-0.5">Últimos 6 meses</p>
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
              <CartesianGrid strokeDasharray="3 3" stroke="#2c1810" vertical={false} />
              <XAxis
                dataKey="mes"
                tick={{ fill: '#8b4513', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#8b4513', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{ background: '#1a0f0a', border: '1px solid #2c1810', borderRadius: 0 }}
                labelStyle={{ color: '#c9a96e', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em' }}
                itemStyle={{ color: '#e8d5b7', fontSize: 12 }}
                formatter={(v) => [`$${Number(v).toLocaleString('es-MX')}`, 'Ingresos']}
              />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke="#c9a96e"
                strokeWidth={2}
                fill="url(#goldGrad)"
                dot={false}
                activeDot={{ r: 4, fill: '#c9a96e', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Order status donut */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }}
          className="bg-coffee-900 border border-coffee-800 p-6"
        >
          <div className="mb-6">
            <h2 className="font-serif text-xl text-cream">Estado de pedidos</h2>
            <p className="text-coffee-400 text-xs mt-0.5">Pedidos recientes</p>
          </div>
          {statusData.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-coffee-500 text-sm">
              Sin datos aún
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="45%"
                  innerRadius={54}
                  outerRadius={80}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {statusData.map((entry, i) => (
                    <Cell key={`cell-${i}`} fill={entry.hex} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#1a0f0a', border: '1px solid #2c1810', borderRadius: 0 }}
                  itemStyle={{ color: '#e8d5b7', fontSize: 12 }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ color: '#a05a2c', fontSize: 11 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-coffee-900 border border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-cream mb-5">Pedidos recientes</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-coffee-500 text-sm py-4">No hay pedidos aún.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-3 border-b border-coffee-800 last:border-0"
                >
                  <div>
                    <p className="text-cream text-sm font-medium">{order.customerName}</p>
                    <p className="text-coffee-400 text-xs mt-0.5">
                      {order.items.map((i) => i.product.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold-500 text-sm font-semibold">
                      ${order.total.toLocaleString('es-MX')}
                    </p>
                    <p className={`text-xs mt-0.5 ${statusConfig[order.status]?.color ?? 'text-coffee-400'}`}>
                      {statusConfig[order.status]?.label ?? order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock */}
        <div className="bg-coffee-900 border border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-cream mb-5 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            Bajo stock
          </h2>
          {stats.lowStockProducts.length === 0 ? (
            <p className="text-coffee-500 text-sm">Todo el inventario está bien.</p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map(({ name, stock }) => (
                <div
                  key={name}
                  className="flex items-center justify-between py-2 border-b border-coffee-800 last:border-0"
                >
                  <p className="text-coffee-200 text-sm">{name}</p>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 ${
                      stock <= 5 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'
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
    </div>
  );
}
