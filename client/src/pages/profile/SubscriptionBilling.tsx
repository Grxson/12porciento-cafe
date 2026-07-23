import { useEffect, useState } from 'react';
import { Calendar, CreditCard, CheckCircle, XCircle, Clock } from 'lucide-react';
import { subscriptionPaymentsApi } from '../../api';
import { getApiError } from '../../lib/api-error';

interface BillingInfo {
  nextBilling: string;
  status: string;
  frequency: string;
  daysUntilBilling: number;
}

interface Payment {
  id: string;
  amount: number;
  status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED';
  billingDate: string;
  errorMessage?: string | null;
}

interface Props {
  subscriptionId: string;
}

const STATUS_ICONS = {
  SUCCEEDED: CheckCircle,
  FAILED: XCircle,
  PENDING: Clock,
  REFUNDED: Clock,
} as const;

const STATUS_LABELS: Record<string, string> = {
  SUCCEEDED: 'Pagado',
  FAILED: 'Fallido',
  PENDING: 'Pendiente',
  REFUNDED: 'Reembolsado',
};

const STATUS_CLASSES: Record<string, string> = {
  SUCCEEDED: 'text-green-400 bg-green-900/20 border-green-500/30',
  FAILED: 'text-red-400 bg-red-900/20 border-red-500/30',
  PENDING: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  REFUNDED: 'text-coffee-600 bg-coffee-100 border-coffee-300 dark:text-coffee-300 dark:bg-coffee-800/40 dark:border-coffee-700',
};

const FREQUENCY_LABELS: Record<string, string> = {
  monthly: 'Facturación mensual',
  bimonthly: 'Facturación bimestral',
};

export default function SubscriptionBilling({ subscriptionId }: Props) {
  const [billingInfo, setBillingInfo] = useState<BillingInfo | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [infoRes, historyRes] = await Promise.all([
          subscriptionPaymentsApi.getNextBilling(subscriptionId),
          subscriptionPaymentsApi.getPaymentHistory(subscriptionId),
        ]);
        setBillingInfo(infoRes.data);
        setPayments(historyRes.data.payments);
      } catch (err: unknown) {
        setError(getApiError(err, 'Error al cargar facturación'));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [subscriptionId]);

  if (loading) {
    return (
      <div className="flex justify-center py-6">
        <div className="w-5 h-5 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <p className="text-red-400 text-sm py-2">{error}</p>;
  }

  return (
    <div className="space-y-5">
      {billingInfo && (
        <div className="rounded-xl border border-coffee-200 dark:border-coffee-700 bg-coffee-50 dark:bg-coffee-800/40 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 text-gold-400" />
            <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wide">Próxima Facturación</h3>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-2xl font-bold text-gold-400">
                {new Date(billingInfo.nextBilling).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-1">
                En {billingInfo.daysUntilBilling} días ·{' '}
                {FREQUENCY_LABELS[billingInfo.frequency] ?? billingInfo.frequency}
              </p>
            </div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                billingInfo.status === 'ACTIVE'
                  ? 'text-green-400 bg-green-900/20 border-green-500/30'
                  : 'text-coffee-600 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800/20 border-coffee-200 dark:border-coffee-700'
              }`}
            >
              {billingInfo.status === 'ACTIVE' ? 'Activa' : billingInfo.status}
            </span>
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-4 h-4 text-gold-400" />
          <h3 className="text-sm font-semibold text-coffee-900 dark:text-cream uppercase tracking-wide">Historial de Pagos</h3>
        </div>

        {payments.length === 0 ? (
          <p className="text-coffee-500 dark:text-coffee-500 text-sm py-2">Sin historial de pagos aún.</p>
        ) : (
          <div className="space-y-2">
            {payments.map((payment) => {
              const Icon = STATUS_ICONS[payment.status] ?? Clock;
              return (
                <div
                  key={payment.id}
                  className="flex items-center justify-between rounded-lg border border-coffee-200 dark:border-coffee-700 bg-white dark:bg-coffee-800/20 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-coffee-900 dark:text-cream">
                      ${payment.amount.toFixed(2)}{' '}
                      <span className="text-xs text-coffee-500 dark:text-coffee-400 font-normal">MXN</span>
                    </p>
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-0.5">
                      {new Date(payment.billingDate).toLocaleDateString('es-MX', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                    {payment.errorMessage && (
                      <p className="text-xs text-red-400 mt-1">{payment.errorMessage}</p>
                    )}
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_CLASSES[payment.status] ?? 'text-coffee-600 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800/20 border-coffee-200 dark:border-coffee-700'}`}
                  >
                    <Icon className="w-3 h-3" />
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
