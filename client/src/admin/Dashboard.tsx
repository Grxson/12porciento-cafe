import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, ShoppingBag, Users, Package, AlertTriangle } from 'lucide-react';
import { dashboardApi } from '../api';
import type { DashboardStats } from '../types';

const statusLabels: Record<string, { label: string; color: string }> = {
  PENDING:    { label: 'Pendiente',   color: 'text-yellow-400' },
  PROCESSING: { label: 'Procesando',  color: 'text-blue-400' },
  SHIPPED:    { label: 'Enviado',     color: 'text-purple-400' },
  DELIVERED:  { label: 'Entregado',   color: 'text-green-400' },
  CANCELLED:  { label: 'Cancelado',   color: 'text-red-400' },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.stats().then((r) => { setStats(r.data); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) return null;

  const cards = [
    { label: 'Ingresos totales', value: `$${stats.totalRevenue.toLocaleString('es-MX')}`, icon: TrendingUp, sub: `$${stats.revenueThisMonth.toLocaleString('es-MX')} este mes`, accent: false },
    { label: 'Pedidos totales', value: stats.totalOrders, icon: ShoppingBag, sub: `${stats.ordersThisWeek} esta semana`, accent: false },
    { label: 'Suscriptores activos', value: stats.activeSubscriptions, icon: Users, sub: 'Suscripciones vigentes', accent: false },
    { label: 'Reseñas pendientes', value: stats.pendingReviews ?? 0, icon: Package, sub: `${stats.lowStockProducts.length} productos bajo stock`, accent: (stats.pendingReviews ?? 0) > 0 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-cream">Dashboard</h1>
        <p className="text-coffee-400 text-sm mt-1">Resumen general de la operación</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {cards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className={`bg-coffee-900 border p-5 transition-colors hover:border-gold-500/30 ${card.accent ? 'border-yellow-500/40' : 'border-coffee-800'}`}
          >
            <div className="flex items-start justify-between mb-3">
              <p className="text-coffee-400 text-xs uppercase tracking-widest">{card.label}</p>
              <card.icon className={`w-4 h-4 ${card.accent ? 'text-yellow-500/80' : 'text-gold-500/60'}`} />
            </div>
            <p className={`font-serif text-3xl font-semibold ${card.accent ? 'text-yellow-400' : 'text-cream'}`}>{card.value}</p>
            <p className="text-coffee-500 text-xs mt-1">{card.sub}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-coffee-900 border border-coffee-800 p-6">
          <h2 className="font-serif text-xl text-cream mb-5">Pedidos recientes</h2>
          {stats.recentOrders.length === 0 ? (
            <p className="text-coffee-500 text-sm py-4">No hay pedidos aún.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between py-3 border-b border-coffee-800 last:border-0">
                  <div>
                    <p className="text-cream text-sm font-medium">{order.customerName}</p>
                    <p className="text-coffee-400 text-xs mt-0.5">
                      {order.items.map((i) => i.product.name).join(', ')}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-gold-500 text-sm font-semibold">${order.total.toLocaleString('es-MX')}</p>
                    <p className={`text-xs mt-0.5 ${statusLabels[order.status]?.color ?? 'text-coffee-400'}`}>
                      {statusLabels[order.status]?.label ?? order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low stock alerts */}
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
                <div key={name} className="flex items-center justify-between py-2 border-b border-coffee-800 last:border-0">
                  <p className="text-coffee-200 text-sm">{name}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 ${stock <= 5 ? 'bg-red-900/30 text-red-400' : 'bg-yellow-900/30 text-yellow-400'}`}>
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
