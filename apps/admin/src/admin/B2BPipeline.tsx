import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CalendarDays,
  CircleDollarSign,
  FilterX,
  RefreshCw,
  Search,
  TimerReset,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { adminUsersApi, b2bApi } from '../api';
import type { B2BInquiry, B2BInquiryStatus } from '../types';
import AdminErrorState from './components/AdminErrorState';
import AdminSkeleton from './components/AdminSkeleton';
import { B2B_STATUS, B2B_STATUS_ORDER, formatB2BMoney } from './b2b-ui';

interface Metrics {
  byStatus: Partial<Record<B2BInquiryStatus, number>>;
  openValue: number;
  companies: number;
}

interface InquiryPage {
  data: B2BInquiry[];
  total: number;
  page: number;
  totalPages: number;
}

type SlaFilter = 'ALL' | 'OVERDUE' | 'DUE_SOON' | 'ON_TRACK' | 'UNPLANNED';

const SLA_LABELS: Record<Exclude<SlaFilter, 'ALL'>, string> = {
  OVERDUE: 'SLA vencido',
  DUE_SOON: 'Próximo a vencer',
  ON_TRACK: 'En tiempo',
  UNPLANNED: 'Sin seguimiento',
};

const terminalStatuses = new Set<B2BInquiryStatus>(['WON', 'LOST']);

function getSlaState(inquiry: B2BInquiry, now = Date.now()): Exclude<SlaFilter, 'ALL'> | 'CLOSED' {
  if (terminalStatuses.has(inquiry.status)) return 'CLOSED';

  if (inquiry.nextFollowUpAt) {
    const followUpAt = new Date(inquiry.nextFollowUpAt).getTime();
    if (followUpAt < now) return 'OVERDUE';
    if (followUpAt <= now + 24 * 60 * 60 * 1000) return 'DUE_SOON';
    return 'ON_TRACK';
  }

  if (inquiry.status === 'NEW') {
    const age = now - new Date(inquiry.createdAt).getTime();
    if (age > 24 * 60 * 60 * 1000) return 'OVERDUE';
    if (age > 18 * 60 * 60 * 1000) return 'DUE_SOON';
    return 'ON_TRACK';
  }

  return 'UNPLANNED';
}

function slaBadge(state: ReturnType<typeof getSlaState>) {
  if (state === 'OVERDUE')
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300';
  if (state === 'DUE_SOON')
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300';
  if (state === 'ON_TRACK')
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300';
  return 'border-coffee-200 bg-coffee-50 text-coffee-500 dark:border-coffee-700 dark:bg-coffee-950/40';
}

export default function B2BPipeline() {
  const navigate = useNavigate();
  const [inquiries, setInquiries] = useState<B2BInquiry[]>([]);
  const [admins, setAdmins] = useState<Array<{ id: string; name: string }>>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    byStatus: {},
    openValue: 0,
    companies: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<B2BInquiryStatus | 'ALL'>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [slaFilter, setSlaFilter] = useState<SlaFilter>('ALL');
  const [loadedTotal, setLoadedTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [firstResponse, metricsResponse, adminsResponse] = await Promise.all([
        b2bApi.inquiries({ page: 1, pageSize: 100 }),
        b2bApi.metrics(),
        adminUsersApi.list(),
      ]);
      const firstPage = firstResponse.data as InquiryPage;
      const remainingResponses =
        firstPage.totalPages > 1
          ? await Promise.all(
              Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
                b2bApi.inquiries({ page: index + 2, pageSize: 100 }),
              ),
            )
          : [];
      const allInquiries = [
        ...firstPage.data,
        ...remainingResponses.flatMap((response) => (response.data as InquiryPage).data),
      ];
      setInquiries(allInquiries);
      setAdmins(adminsResponse.data);
      setLoadedTotal(firstPage.total);
      setMetrics(metricsResponse.data.data);
    } catch {
      setError('No fue posible cargar el pipeline comercial completo.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const to = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return inquiries.filter((inquiry) => {
      const createdAt = new Date(inquiry.createdAt).getTime();
      const matchesSearch =
        !query ||
        [inquiry.folio, inquiry.empresa, inquiry.rfc, inquiry.contactoNombre]
          .filter((v): v is string => Boolean(v))
          .some((value) => value.toLowerCase().includes(query));
      const matchesStatus = statusFilter === 'ALL' || inquiry.status === statusFilter;
      const matchesAssignee =
        assigneeFilter === 'ALL' ||
        (assigneeFilter === 'UNASSIGNED'
          ? !inquiry.assignedAdmin
          : inquiry.assignedAdmin?.id === assigneeFilter);
      const matchesDate = (from === null || createdAt >= from) && (to === null || createdAt <= to);
      const matchesSla = slaFilter === 'ALL' || getSlaState(inquiry) === slaFilter;
      return matchesSearch && matchesStatus && matchesAssignee && matchesDate && matchesSla;
    });
  }, [assigneeFilter, dateFrom, dateTo, inquiries, search, slaFilter, statusFilter]);

  const activeFilterCount = [
    search,
    statusFilter !== 'ALL',
    assigneeFilter !== 'ALL',
    dateFrom,
    dateTo,
    slaFilter !== 'ALL',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('ALL');
    setAssigneeFilter('ALL');
    setDateFrom('');
    setDateTo('');
    setSlaFilter('ALL');
  };

  if (loading) return <AdminSkeleton rows={8} />;
  if (error) return <AdminErrorState error={error} onRetry={load} />;

  const visibleStatuses =
    statusFilter === 'ALL'
      ? B2B_STATUS_ORDER
      : B2B_STATUS_ORDER.filter((status) => status === statusFilter);

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
        <button
          type="button"
          onClick={load}
          className="flex h-10 items-center justify-center gap-2 border border-coffee-200 bg-white px-4 text-xs font-semibold uppercase tracking-wider text-coffee-600 hover:border-gold-500 hover:text-gold-700 dark:border-coffee-700 dark:bg-coffee-900 dark:text-coffee-300"
        >
          <RefreshCw className="h-4 w-4" /> Actualizar
        </button>
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

      <section className="border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_repeat(5,minmax(130px,1fr))]">
          <label className="relative min-w-0">
            <span className="sr-only">Buscar solicitudes</span>
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Folio, empresa, RFC…"
              className="h-10 w-full border border-coffee-200 bg-coffee-50 pl-9 pr-3 text-sm outline-none focus:border-gold-500 dark:border-coffee-700 dark:bg-coffee-950/40"
            />
          </label>
          <label>
            <span className="sr-only">Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as B2BInquiryStatus | 'ALL')}
              className="h-10 w-full border border-coffee-200 bg-coffee-50 px-3 text-sm dark:border-coffee-700 dark:bg-coffee-950/40"
            >
              <option value="ALL">Todos los estados</option>
              {B2B_STATUS_ORDER.map((status) => (
                <option key={status} value={status}>
                  {B2B_STATUS[status].label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Responsable</span>
            <select
              value={assigneeFilter}
              onChange={(event) => setAssigneeFilter(event.target.value)}
              className="h-10 w-full border border-coffee-200 bg-coffee-50 px-3 text-sm dark:border-coffee-700 dark:bg-coffee-950/40"
            >
              <option value="ALL">Todos los responsables</option>
              <option value="UNASSIGNED">Sin responsable</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Desde</span>
            <input
              type="date"
              aria-label="Solicitudes desde"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-10 w-full border border-coffee-200 bg-coffee-50 px-3 text-sm dark:border-coffee-700 dark:bg-coffee-950/40"
            />
          </label>
          <label>
            <span className="sr-only">Hasta</span>
            <input
              type="date"
              aria-label="Solicitudes hasta"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-10 w-full border border-coffee-200 bg-coffee-50 px-3 text-sm dark:border-coffee-700 dark:bg-coffee-950/40"
            />
          </label>
          <label>
            <span className="sr-only">SLA</span>
            <select
              value={slaFilter}
              onChange={(event) => setSlaFilter(event.target.value as SlaFilter)}
              className="h-10 w-full border border-coffee-200 bg-coffee-50 px-3 text-sm dark:border-coffee-700 dark:bg-coffee-950/40"
            >
              <option value="ALL">Todos los SLA</option>
              {Object.entries(SLA_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-coffee-500">
          <p>
            Mostrando{' '}
            <strong className="text-coffee-800 dark:text-coffee-200">{filtered.length}</strong> de{' '}
            {loadedTotal} solicitudes cargadas.
          </p>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={clearFilters}
              className="flex items-center gap-1.5 font-medium text-gold-700 hover:text-gold-900 dark:text-gold-400"
            >
              <FilterX className="h-3.5 w-3.5" /> Limpiar {activeFilterCount} filtros
            </button>
          )}
        </div>
      </section>

      <section
        className={`grid items-start gap-4 ${
          visibleStatuses.length === 1
            ? 'grid-cols-1'
            : 'md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6'
        }`}
      >
        {visibleStatuses.map((status) => {
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
                  entries.map((inquiry) => {
                    const sla = getSlaState(inquiry);
                    return (
                      <button
                        type="button"
                        key={inquiry.id}
                        onClick={() => navigate(`/b2b/solicitudes/${inquiry.id}`)}
                        className="w-full border border-coffee-200 bg-white p-3 text-left transition hover:-translate-y-0.5 hover:border-gold-500/60 hover:shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-500 dark:border-coffee-700 dark:bg-coffee-900"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-[10px] uppercase tracking-wider text-gold-700 dark:text-gold-400">
                            {inquiry.folio}
                          </p>
                          {sla !== 'CLOSED' && (
                            <span
                              className={`border px-1.5 py-0.5 text-[9px] font-medium ${slaBadge(sla)}`}
                            >
                              {SLA_LABELS[sla]}
                            </span>
                          )}
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-sm font-semibold text-coffee-950 dark:text-cream">
                          {inquiry.empresa}
                        </p>
                        <p className="mt-2 text-xs text-coffee-500">
                          {inquiry.items?.length || 0} partidas ·{' '}
                          {formatB2BMoney(inquiry.estimatedSubtotal)}
                        </p>
                        <div className="mt-3 space-y-1.5 border-t border-coffee-100 pt-2 text-[10px] text-coffee-500 dark:border-coffee-800">
                          <p className="flex items-center gap-1.5">
                            <UserRound className="h-3 w-3" />
                            {inquiry.assignedAdmin?.name || 'Sin responsable'}
                          </p>
                          <p className="flex items-center gap-1.5">
                            <CalendarDays className="h-3 w-3" />
                            {inquiry.nextFollowUpAt
                              ? new Date(inquiry.nextFollowUpAt).toLocaleString('es-MX', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : new Date(inquiry.createdAt).toLocaleDateString('es-MX')}
                            <ArrowRight className="ml-auto h-3.5 w-3.5" />
                          </p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
