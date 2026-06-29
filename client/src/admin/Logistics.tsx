import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import type { Order } from '../types';
import { RefreshCw, Edit3, Truck } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import Pagination from './components/Pagination';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import AdminModal from './components/AdminModal';
import { useModuleToast } from './context/ModuleContext';

const CARRIERS = ['FedEx', 'Estafeta', 'DHL', '99minutos', 'J&T Express', 'Correos de México', 'Otro'];

const INPUT_CLASS = 'w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500/50';

const STATUS_COLORS: Record<string, string> = {
  PENDING:   'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400',
  CONFIRMED: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400',
  PREPARING: 'bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400',
  SHIPPED:   'bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400',
  DELIVERED: 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400',
  CANCELLED: 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:   'Pendiente',
  CONFIRMED: 'Confirmado',
  PREPARING: 'Preparando',
  SHIPPED:   'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING:   ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['SHIPPED', 'CANCELLED'],
  SHIPPED:   ['DELIVERED'],
};

interface TrackingEdit {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  estimatedDelivery: string;
}

export default function Logistics() {
  const { addToast } = useModuleToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trackingEdit, setTrackingEdit] = useState<TrackingEdit | null>(null);
  const [savingTracking, setSavingTracking] = useState(false);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await adminApi.logistics({ status: statusFilter, page });
      setOrders(res.data.data);
      setTotal(res.data.total);
      setTotalPages(res.data.totalPages);
      setStatusCounts(res.data.statusCounts);
    } catch (err) {
      setError('Error al cargar pedidos');
      addToast('Error al cargar pedidos', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [page, statusFilter]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      await adminApi.updateOrderStatus(orderId, newStatus);
      loadOrders();
    } catch (err) {
      addToast('Error al actualizar estado', 'error');
    }
  };

  const openTrackingEdit = (order: Order) => {
    setTrackingEdit({
      orderId: order.id,
      trackingNumber: order.trackingNumber ?? '',
      carrier: order.carrier ?? '',
      estimatedDelivery: order.estimatedDelivery
        ? new Date(order.estimatedDelivery).toISOString().slice(0, 10)
        : '',
    });
  };

  const saveTracking = async () => {
    if (!trackingEdit) return;
    setSavingTracking(true);
    try {
      await adminApi.updateOrderTracking(trackingEdit.orderId, {
        trackingNumber: trackingEdit.trackingNumber || undefined,
        carrier: trackingEdit.carrier || undefined,
        estimatedDelivery: trackingEdit.estimatedDelivery || null,
      });
      addToast('Tracking actualizado', 'success');
      setTrackingEdit(null);
      loadOrders();
    } catch {
      addToast('Error al guardar tracking', 'error');
    } finally {
      setSavingTracking(false);
    }
  };

  const statusTabs = [
    { key: undefined, label: `Todos (${Object.values(statusCounts).reduce((a, b) => a + b, 0) || 0})` },
    { key: 'PENDING',   label: `Pendientes (${statusCounts.PENDING || 0})` },
    { key: 'CONFIRMED', label: `Confirmados (${statusCounts.CONFIRMED || 0})` },
    { key: 'PREPARING', label: `Preparando (${statusCounts.PREPARING || 0})` },
    { key: 'SHIPPED',   label: `Enviados (${statusCounts.SHIPPED || 0})` },
    { key: 'DELIVERED', label: `Entregados (${statusCounts.DELIVERED || 0})` },
  ];

  return (
    <div className="p-6 space-y-6">
      <PageMeta title="Logística" noSuffix />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Logística</h1>
        <button
          onClick={loadOrders}
          className="p-2 rounded-lg bg-coffee-100 dark:bg-coffee-800 hover:bg-coffee-200 dark:hover:bg-coffee-700 text-coffee-700 dark:text-cream"
        >
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
                : 'bg-coffee-100 dark:bg-coffee-800 text-coffee-600 dark:text-cream/70 hover:bg-coffee-200 dark:hover:bg-coffee-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading && <AdminSkeleton rows={6} />}
      {!loading && error && <AdminErrorState error={error} onRetry={loadOrders} />}

      {/* Orders table */}
      {!loading && !error && (
        <div className="bg-white dark:bg-coffee-900 rounded-xl overflow-hidden border border-coffee-200 dark:border-coffee-700">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-coffee-50 dark:bg-coffee-800">
                <tr>
                  <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">Pedido</th>
                  <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">Cliente</th>
                  <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">Fecha</th>
                  <th className="text-center p-3 text-coffee-600 dark:text-cream/60 font-medium">Artículos</th>
                  <th className="text-right p-3 text-coffee-600 dark:text-cream/60 font-medium">Total</th>
                  <th className="text-center p-3 text-coffee-600 dark:text-cream/60 font-medium">Estado</th>
                  <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">Tracking</th>
                  <th className="text-center p-3 text-coffee-600 dark:text-cream/60 font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-200 dark:divide-coffee-700">
                {orders.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12">
                    <p className="text-coffee-500 dark:text-coffee-400">Sin pedidos</p>
                  </td></tr>
                ) : orders.map(order => (
                  <tr key={order.id} className="hover:bg-coffee-100 dark:hover:bg-coffee-800/50">
                    <td className="p-3 text-coffee-900 dark:text-cream font-mono">#{order.id.slice(-6).toUpperCase()}</td>
                    <td className="p-3">
                      <div className="text-coffee-900 dark:text-cream">{order.user?.name || '—'}</div>
                      <div className="text-coffee-500 dark:text-cream/50 text-xs">{order.user?.email}</div>
                    </td>
                    <td className="p-3 text-coffee-600 dark:text-cream/70">{new Date(order.createdAt).toLocaleDateString('es-MX')}</td>
                    <td className="p-3 text-center text-coffee-900 dark:text-cream">{order.items?.length || 0}</td>
                    <td className="p-3 text-right text-coffee-900 dark:text-cream">${(order.total || 0).toFixed(2)}</td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[order.status] || ''}`}>
                        {STATUS_LABELS[order.status] || order.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-1.5">
                        {order.trackingNumber ? (
                          <div>
                            <p className="text-xs font-mono text-coffee-900 dark:text-cream">{order.trackingNumber}</p>
                            {order.carrier && <p className="text-xs text-coffee-500 dark:text-coffee-400">{order.carrier}</p>}
                          </div>
                        ) : (
                          <span className="text-xs text-coffee-400 dark:text-coffee-500">—</span>
                        )}
                        <button
                          onClick={() => openTrackingEdit(order)}
                          className="ml-1 p-1 text-coffee-400 dark:text-coffee-500 hover:text-gold-500 transition-colors shrink-0"
                          title="Editar tracking"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value=""
                        onChange={e => { if (e.target.value) updateStatus(order.id, e.target.value); }}
                        className="bg-coffee-50 dark:bg-coffee-700 text-coffee-900 dark:text-cream text-xs rounded px-2 py-1 border border-coffee-200 dark:border-coffee-600"
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
      )}

      {/* Pagination */}
      {!loading && !error && (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      )}

      {/* Tracking modal */}
      <AdminModal
        open={!!trackingEdit}
        title="Información de envío"
        onClose={() => setTrackingEdit(null)}
        footer={
          <div className="flex justify-end gap-3 flex-1">
            <button
              onClick={() => setTrackingEdit(null)}
              className="px-4 py-2 text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-200 dark:border-coffee-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={saveTracking}
              disabled={savingTracking}
              className="px-4 py-2 text-sm bg-gold-600 text-coffee-950 font-medium hover:bg-gold-500 transition-colors disabled:opacity-50"
            >
              {savingTracking ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        }
      >
        {trackingEdit && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">
                <Truck className="inline w-3.5 h-3.5 mr-1" />Número de guía
              </label>
              <input
                value={trackingEdit.trackingNumber}
                onChange={(e) => setTrackingEdit({ ...trackingEdit, trackingNumber: e.target.value })}
                placeholder="Ej. 1Z999AA1234567890"
                className={INPUT_CLASS}
              />
            </div>
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">Transportista</label>
              <select
                value={trackingEdit.carrier}
                onChange={(e) => setTrackingEdit({ ...trackingEdit, carrier: e.target.value })}
                className={INPUT_CLASS}
              >
                <option value="">Seleccionar transportista</option>
                {CARRIERS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">Entrega estimada</label>
              <input
                type="date"
                value={trackingEdit.estimatedDelivery}
                onChange={(e) => setTrackingEdit({ ...trackingEdit, estimatedDelivery: e.target.value })}
                className={INPUT_CLASS}
              />
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
}
