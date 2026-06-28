import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import type { Order } from '../types';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-500/20 text-amber-400',
  CONFIRMED: 'bg-blue-500/20 text-blue-400',
  PREPARING: 'bg-purple-500/20 text-purple-400',
  SHIPPED: 'bg-indigo-500/20 text-indigo-400',
  DELIVERED: 'bg-green-500/20 text-green-400',
  CANCELLED: 'bg-red-500/20 text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
};

export default function Logistics() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const res = await adminApi.logistics({ status: statusFilter, page });
      setOrders(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setStatusCounts(res.data.statusCounts);
    } catch (err) {
      console.error('Failed to load logistics:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const statusTabs = [
    { key: undefined, label: `Todos (${Object.values(statusCounts).reduce((a, b) => a + b, 0) || 0})` },
    { key: 'PENDING', label: `Pendientes (${statusCounts.PENDING || 0})` },
    { key: 'CONFIRMED', label: `Confirmados (${statusCounts.CONFIRMED || 0})` },
    { key: 'PREPARING', label: `Preparando (${statusCounts.PREPARING || 0})` },
    { key: 'SHIPPED', label: `Enviados (${statusCounts.SHIPPED || 0})` },
    { key: 'DELIVERED', label: `Entregados (${statusCounts.DELIVERED || 0})` },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-cream">Logística</h1>
        <button onClick={loadOrders} className="p-2 rounded-lg bg-coffee-800 hover:bg-coffee-700 text-cream">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-2">
        {statusTabs.map(tab => (
          <button
            key={tab.key || 'all'}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              statusFilter === tab.key
                ? 'bg-gold-500 text-coffee-950'
                : 'bg-coffee-800 text-cream/70 hover:bg-coffee-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-coffee-900 rounded-xl overflow-hidden border border-coffee-700">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-coffee-800">
              <tr>
                <th className="text-left p-3 text-cream/60 font-medium">Pedido</th>
                <th className="text-left p-3 text-cream/60 font-medium">Cliente</th>
                <th className="text-left p-3 text-cream/60 font-medium">Fecha</th>
                <th className="text-center p-3 text-cream/60 font-medium">Artículos</th>
                <th className="text-right p-3 text-cream/60 font-medium">Total</th>
                <th className="text-center p-3 text-cream/60 font-medium">Estado</th>
                <th className="text-center p-3 text-cream/60 font-medium">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-coffee-700">
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8 text-cream/40">Cargando...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-cream/40">Sin pedidos</td></tr>
              ) : orders.map(order => (
                <tr key={order.id} className="hover:bg-coffee-800/50">
                  <td className="p-3 text-cream font-mono">#{order.id.slice(-6).toUpperCase()}</td>
                  <td className="p-3">
                    <div className="text-cream">{order.user?.name || '—'}</div>
                    <div className="text-cream/50 text-xs">{order.user?.email}</div>
                  </td>
                  <td className="p-3 text-cream/70">{new Date(order.createdAt).toLocaleDateString('es-MX')}</td>
                  <td className="p-3 text-center text-cream">{order.items?.length || 0}</td>
                  <td className="p-3 text-right text-cream">${(order.total || 0).toFixed(2)}</td>
                  <td className="p-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || ''}`}>
                      {STATUS_LABELS[order.status] || order.status}
                    </span>
                  </td>
                  <td className="p-3 text-center">
                    <select
                      value=""
                      onChange={e => { if (e.target.value) updateStatus(order.id, e.target.value); }}
                      className="bg-coffee-700 text-cream text-xs rounded px-2 py-1 border border-coffee-600"
                    >
                      <option value="" disabled>Cambiar a...</option>
                      {(STATUS_TRANSITIONS[order.status] || []).map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s] || s}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 text-cream/70">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded disabled:opacity-30 hover:bg-coffee-800"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span>Página {page} de {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded disabled:opacity-30 hover:bg-coffee-800"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
