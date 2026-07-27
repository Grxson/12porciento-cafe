import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CircleDollarSign,
  RefreshCw,
  Search,
  TimerReset,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { b2bApi } from '../api';
import type { B2BInquiry, B2BInquiryStatus } from '../types';
import AdminErrorState from './components/AdminErrorState';
import AdminSkeleton from './components/AdminSkeleton';
import { B2B_STATUS, B2B_STATUS_ORDER, formatB2BMoney } from './b2b-ui';

interface Metrics {
  byStatus: Partial<Record<B2BInquiryStatus, number>>;
  openValue: number;
  companies: number;
}

export default function B2BPipeline() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<B2BInquiry[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    byStatus: {},
    openValue: 0,
    companies: 0,
  });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [listResponse, metricsResponse] = await Promise.all([
        b2bApi.inquiries({ pageSize: 100 }),
        b2bApi.metrics(),
      ]);
      setInquiries(listResponse.data.data);
      setMetrics(metricsResponse.data.data);
    } catch {
      setError('No fue posible cargar el pipeline comercial.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return inquiries;
    return inquiries.filter((inquiry) =>
      [inquiry.folio, inquiry.empresa, inquiry.rfc, inquiry.contactoNombre]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [inquiries, search]);

  if (loading) return <AdminSkeleton rows={8} />;
  if (error) return <AdminErrorState error={error} onRetry={load} />;

  return (
    <div className="space-y-7">
      <header className="flex flex-col justify-between gap-5 xl:flex-row xl:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Ventas empresariales
          </p>
          <h1 className="mt-2 font-serif text-4xl text-coffee-950 dark:text-cream">Pipeline B2B</h1>
          <p className="mt-2 max-w-2xl text-sm text-coffee-600 dark:text-coffee-400">
            Cada solicitud conserva su selección, cotizaciones y actividad hasta convertirse en
            empresa y pedido.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="relative min-w-0 sm:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Folio, empresa, RFC…"
              className="w-full border border-coffee-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-gold-500 dark:border-coffee-700 dark:bg-coffee-900"
            />
          </label>
          <button
            type="button"
            onClick={load}
            aria-label="Actualizar pipeline"
            className="grid h-10 w-10 place-items-center border border-coffee-200 bg-white text-coffee-600 hover:text-gold-600 dark:border-coffee-700 dark:bg-coffee-900 dark:text-coffee-300"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [
            TimerReset,
            'Solicitudes abiertas',
            B2B_STATUS_ORDER.slice(0, 4).reduce(
              (sum, key) => sum + (metrics.byStatus[key] || 0),
              0,
            ),
          ],
          [CircleDollarSign, 'Valor estimado abierto', formatB2BMoney(metrics.openValue)],
          [Building2, 'Empresas convertidas', metrics.companies],
          [ArrowRight, 'Pendientes de revisión', metrics.byStatus.NEW || 0],
        ].map(([Icon, label, value]) => {
          const MetricIcon = Icon as typeof Building2;
          return (
            <div
              key={String(label)}
              className="border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900"
            >
              <MetricIcon className="h-5 w-5 text-gold-600 dark:text-gold-400" />
              <p className="mt-4 text-xs uppercase tracking-wider text-coffee-500">
                {String(label)}
              </p>
              <p className="mt-1 font-serif text-2xl text-coffee-950 dark:text-cream">
                {String(value)}
              </p>
            </div>
          );
        })}
      </section>

      <section className="grid items-start gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {B2B_STATUS_ORDER.map((status) => {
          const entries = filtered.filter((inquiry) => inquiry.status === status);
          const config = B2B_STATUS[status];
          return (
            <div
              key={status}
              className="min-w-0 border border-coffee-200 bg-coffee-100/60 dark:border-coffee-800 dark:bg-coffee-900/50"
            >
              <div className="flex items-center justify-between border-b border-coffee-200 px-3 py-3 dark:border-coffee-800">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${config.dot}`} />
                  <h2 className="text-xs font-semibold uppercase tracking-wider">{config.short}</h2>
                </div>
                <span className="text-xs text-coffee-500">{entries.length}</span>
              </div>
              <div className="space-y-2 p-2">
                {entries.length === 0 ? (
                  <p className="px-2 py-8 text-center text-xs text-coffee-400">Sin solicitudes</p>
                ) : (
                  entries.map((inquiry) => (
                    <button
                      type="button"
                      key={inquiry.id}
                      onClick={() => navigate(`/b2b/solicitudes/${inquiry.id}`)}
                      className="w-full border border-coffee-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-sm dark:border-coffee-700 dark:bg-coffee-900"
                    >
                      <p className="text-[10px] uppercase tracking-wider text-gold-700 dark:text-gold-400">
                        {inquiry.folio}
                      </p>
                      <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-coffee-950 dark:text-cream">
                        {inquiry.empresa}
                      </p>
                      <p className="mt-2 text-xs text-coffee-500">
                        {inquiry.items?.length || 0} partidas ·{' '}
                        {formatB2BMoney(inquiry.estimatedSubtotal)}
                      </p>
                      <div className="mt-3 flex items-center justify-between border-t border-coffee-100 pt-2 text-[10px] text-coffee-500 dark:border-coffee-800">
                        <span>{new Date(inquiry.createdAt).toLocaleDateString('es-MX')}</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
