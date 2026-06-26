import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { subscriptionPaymentsApi } from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import { useModuleToast } from './context/ModuleContext';

interface SubscriptionPayment {
  id: string;
  status: string;
  amount: number;
  billingDate: string;
  stripeInvoiceId: string;
  subscription: {
    name: string;
    email: string;
    plan: string;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const statusBadge: Record<string, { label: string; color: string }> = {
  COMPLETED: { label: 'Completado', color: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-500/30' },
  FAILED: { label: 'Fallido', color: 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-500/30' },
  PENDING: { label: 'Pendiente', color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30' },
  REFUNDED: { label: 'Reembolsado', color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' },
  CANCELLED: { label: 'Cancelado', color: 'text-gray-400 bg-gray-900/20 border-gray-500/30' },
};

const planLabels: Record<string, string> = {
  FUNDADOR: 'Fundador',
  EXPLORADOR: 'Explorador',
  CONNOISSEUR: 'Connoisseur',
  EMPRESARIAL: 'Empresarial',
};

export default function SubscriptionPayments() {
  const { addToast } = useModuleToast();
  const [payments, setPayments] = useState<SubscriptionPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, pages: 0 });

  const loadPage = (p: number) => {
    setLoading(true);
    setListError('');
    subscriptionPaymentsApi.list({ page: p.toString(), limit: '20' })
      .then((r) => {
        setPayments(r.data.data);
        setPagination(r.data.pagination);
      })
      .catch(() => {
        setListError('Error al cargar pagos');
        addToast('Error al cargar pagos', 'error');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  return (
    <div className="p-8">
      <PageMeta title="Pagos de Suscripciones" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <CreditCard className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Pagos de Suscripciones</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{pagination.total} pagos</p>
        </div>
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : listError ? (
        <AdminErrorState error={listError} onRetry={() => loadPage(pagination.page)} />
      ) : payments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <CreditCard className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">Sin pagos registrados</p>
        </div>
      ) : (
        <>
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-coffee-200 dark:border-coffee-800">
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Suscriptor</th>
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Plan</th>
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Monto</th>
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Fecha</th>
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Estado</th>
                    <th className="text-left text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">Factura</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const badge = statusBadge[p.status] ?? { label: p.status, color: 'text-coffee-500 dark:text-coffee-400 bg-coffee-800/20 border-coffee-700/30' };
                    return (
                      <tr key={p.id} className="border-b border-coffee-200/50 dark:border-coffee-800/50 bg-white dark:bg-coffee-800 hover:bg-coffee-50 dark:hover:bg-coffee-700 transition-colors">
                        <td className="px-4 py-3">
                          <p className="text-coffee-900 dark:text-cream font-medium">{p.subscription.name}</p>
                          <p className="text-coffee-500 dark:text-coffee-400 text-xs">{p.subscription.email}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-gold-500 text-xs font-medium uppercase tracking-wider">
                            {planLabels[p.subscription.plan] ?? p.subscription.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-coffee-900 dark:text-cream font-mono">${p.amount}</td>
                        <td className="px-4 py-3 text-coffee-700 dark:text-coffee-300">
                          {new Date(p.billingDate).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] px-2 py-0.5 border rounded-sm whitespace-nowrap ${badge.color}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-coffee-600 dark:text-coffee-400 text-xs font-mono">{p.stripeInvoiceId}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {pagination.pages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-6">
              <button
                onClick={() => loadPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Anterior
              </button>
              <span className="text-sm text-coffee-600 dark:text-coffee-400">
                Página {pagination.page} de {pagination.pages}
              </span>
              <button
                onClick={() => loadPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                className="px-3 py-1.5 text-sm border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
