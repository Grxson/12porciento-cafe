import { useState, useEffect } from 'react';
import { reconciliationApi, type StripeWebhookEventRow, type StuckOrderRow } from '../api';
import { RefreshCw, RotateCw } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import { useModuleToast } from './context/ModuleContext';

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  REQUIRES_ACTION: 'Requiere acción (3DS)',
  FAILED: 'Fallido',
};

export default function Reconciliation() {
  const { addToast } = useModuleToast();
  const [failedWebhookEvents, setFailedWebhookEvents] = useState<StripeWebhookEventRow[]>([]);
  const [stuckOrders, setStuckOrders] = useState<StuckOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await reconciliationApi.list();
      setFailedWebhookEvents(res.data.data.failedWebhookEvents);
      setStuckOrders(res.data.data.stuckOrders);
    } catch {
      setError('Error al cargar datos de reconciliación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const retry = async (stripeEventId: string) => {
    setRetryingId(stripeEventId);
    try {
      await reconciliationApi.retry(stripeEventId);
      addToast('Evento reprocesado correctamente', 'success');
      load();
    } catch {
      addToast('El reintento falló — revisa el error en Stripe', 'error');
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <PageMeta title="Reconciliación" noSuffix />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Reconciliación</h1>
        <button
          onClick={load}
          className="p-2 rounded-lg bg-coffee-100 dark:bg-coffee-800 hover:bg-coffee-200 dark:hover:bg-coffee-700 text-coffee-700 dark:text-cream"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {loading && <AdminSkeleton rows={6} />}
      {!loading && error && <AdminErrorState error={error} onRetry={load} />}

      {!loading && !error && (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
              Webhooks fallidos ({failedWebhookEvents.length})
            </h2>
            <div className="bg-white dark:bg-coffee-900 rounded-xl overflow-hidden border border-coffee-200 dark:border-coffee-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-coffee-50 dark:bg-coffee-800">
                    <tr>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Evento
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Tipo
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Error
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Fecha
                      </th>
                      <th className="text-center p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Acción
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-200 dark:divide-coffee-700">
                    {failedWebhookEvents.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-12">
                          <p className="text-coffee-500 dark:text-coffee-400">
                            Sin eventos fallidos
                          </p>
                        </td>
                      </tr>
                    ) : (
                      failedWebhookEvents.map((ev) => (
                        <tr key={ev.id} className="hover:bg-coffee-100 dark:hover:bg-coffee-800/50">
                          <td className="p-3 text-coffee-900 dark:text-cream font-mono text-xs">
                            {ev.stripeEventId}
                          </td>
                          <td className="p-3 text-coffee-600 dark:text-cream/70">{ev.eventType}</td>
                          <td className="p-3 text-red-600 dark:text-red-400 text-xs max-w-xs truncate">
                            {ev.errorMessage || '—'}
                          </td>
                          <td className="p-3 text-coffee-600 dark:text-cream/70">
                            {new Date(ev.processedAt).toLocaleString('es-MX')}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => retry(ev.stripeEventId)}
                              disabled={retryingId === ev.stripeEventId}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gold-600 text-coffee-950 font-medium hover:bg-gold-500 transition-colors disabled:opacity-50"
                            >
                              <RotateCw
                                className={`w-3.5 h-3.5 ${retryingId === ev.stripeEventId ? 'animate-spin' : ''}`}
                              />
                              Reintentar
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
              Pedidos con pago sin resolver ({stuckOrders.length})
            </h2>
            <div className="bg-white dark:bg-coffee-900 rounded-xl overflow-hidden border border-coffee-200 dark:border-coffee-700">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-coffee-50 dark:bg-coffee-800">
                    <tr>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Cliente
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Total
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Estado
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Motivo
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        PaymentIntent
                      </th>
                      <th className="text-left p-3 text-coffee-600 dark:text-cream/60 font-medium">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-200 dark:divide-coffee-700">
                    {stuckOrders.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-12">
                          <p className="text-coffee-500 dark:text-coffee-400">
                            Sin pedidos pendientes
                          </p>
                        </td>
                      </tr>
                    ) : (
                      stuckOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="hover:bg-coffee-100 dark:hover:bg-coffee-800/50"
                        >
                          <td className="p-3">
                            <div className="text-coffee-900 dark:text-cream">
                              {order.customerName}
                            </div>
                            <div className="text-coffee-500 dark:text-cream/50 text-xs">
                              {order.email}
                            </div>
                          </td>
                          <td className="p-3 text-coffee-900 dark:text-cream">
                            ${order.total.toFixed(2)}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400">
                              {PAYMENT_STATUS_LABELS[order.paymentStatus] || order.paymentStatus}
                            </span>
                          </td>
                          <td className="p-3 text-coffee-600 dark:text-cream/70 text-xs max-w-xs truncate">
                            {order.paymentFailureReason || '—'}
                          </td>
                          <td className="p-3 text-coffee-600 dark:text-cream/70 font-mono text-xs">
                            {order.paymentIntentId || '—'}
                          </td>
                          <td className="p-3 text-coffee-600 dark:text-cream/70">
                            {new Date(order.createdAt).toLocaleDateString('es-MX')}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
