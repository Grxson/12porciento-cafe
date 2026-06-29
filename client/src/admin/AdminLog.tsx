import { useCallback, useEffect, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import { adminApi } from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';

interface AdminLogEntry {
  id: string;
  adminId: string | null;
  admin: { id: string; name: string; email: string } | null;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: string | null;
  createdAt: string;
}

const ACTION_COLORS: Record<string, string> = {
  CREATE:        'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20',
  UPDATE:        'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20',
  DELETE:        'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/20',
  TOGGLE:        'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20',
  APPROVE:       'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/20',
  STATUS_CHANGE: 'text-gold-600 dark:text-gold-400 bg-gold-100 dark:bg-gold-900/20',
  ADJUST:        'text-coffee-700 dark:text-coffee-300 bg-coffee-100 dark:bg-coffee-800/40',
};

const ENTITIES = ['Product', 'Order', 'Subscription', 'PromoCode', 'Recipe', 'Review', 'Inventory'];
const ACTIONS  = ['CREATE', 'UPDATE', 'DELETE', 'TOGGLE', 'APPROVE', 'STATUS_CHANGE', 'ADJUST'];

const SELECT_CLASS = 'bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500/50';

export default function AdminLog() {
  const [logs, setLogs] = useState<AdminLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = useCallback((p: number) => {
    setLoading(true);
    setLoadError('');
    const params: Record<string, string> = { page: String(p) };
    if (entityFilter) params.entity = entityFilter;
    if (actionFilter) params.action = actionFilter;
    adminApi.logs(params)
      .then((r) => {
        setLogs(r.data.data);
        setTotalPages(r.data.totalPages ?? 1);
        setTotal(r.data.total ?? 0);
      })
      .catch(() => setLoadError('Error al cargar logs de auditoría.'))
      .finally(() => setLoading(false));
  }, [entityFilter, actionFilter]);

  useEffect(() => { load(page); }, [load, page]);

  const formatMeta = (raw: string | null) => {
    if (!raw) return '—';
    try {
      return JSON.stringify(JSON.parse(raw), null, 0);
    } catch {
      return raw;
    }
  };

  return (
    <div className="p-8">
      <PageMeta title="Auditoría" noSuffix />
      <div className="flex items-center gap-3 mb-8">
        <ClipboardList className="w-6 h-6 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Auditoría</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{total} acciones registradas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className={SELECT_CLASS}
        >
          <option value="">Todas las entidades</option>
          {ENTITIES.map((e) => <option key={e} value={e}>{e}</option>)}
        </select>
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className={SELECT_CLASS}
        >
          <option value="">Todas las acciones</option>
          {ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        {(entityFilter || actionFilter) && (
          <button
            onClick={() => { setEntityFilter(''); setActionFilter(''); setPage(1); }}
            className="text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors px-3 py-2 border border-coffee-200 dark:border-coffee-700"
          >
            Limpiar
          </button>
        )}
      </div>

      {loading ? (
        <AdminSkeleton rows={8} />
      ) : loadError ? (
        <AdminErrorState error={loadError} onRetry={() => load(page)} />
      ) : logs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ClipboardList className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay registros de auditoría.</p>
        </div>
      ) : (
        <>
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-200 dark:border-coffee-800">
                    {['Fecha', 'Admin', 'Acción', 'Entidad', 'ID', 'Detalles'].map((h) => (
                      <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors">
                      <td className="px-4 py-3 text-coffee-500 dark:text-coffee-400 text-xs whitespace-nowrap">
                        {new Date(log.createdAt).toLocaleString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        {log.admin ? (
                          <div>
                            <p className="text-coffee-900 dark:text-cream text-xs font-medium">{log.admin.name}</p>
                            <p className="text-coffee-500 dark:text-coffee-400 text-xs">{log.admin.email}</p>
                          </div>
                        ) : (
                          <span className="text-coffee-400 dark:text-coffee-500 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 font-medium ${ACTION_COLORS[log.action] ?? 'text-coffee-600 dark:text-coffee-400 bg-coffee-100 dark:bg-coffee-800'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-coffee-900 dark:text-cream text-xs font-medium">{log.entity}</td>
                      <td className="px-4 py-3 text-coffee-500 dark:text-coffee-400 font-mono text-xs">
                        {log.entityId ? log.entityId.slice(0, 8) + '…' : '—'}
                      </td>
                      <td className="px-4 py-3">
                        {log.metadata ? (
                          <span
                            title={formatMeta(log.metadata)}
                            className="text-xs text-coffee-600 dark:text-coffee-400 cursor-help max-w-[200px] truncate block"
                          >
                            {formatMeta(log.metadata)}
                          </span>
                        ) : (
                          <span className="text-coffee-400 dark:text-coffee-500 text-xs">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(p) => load(p)} />
        </>
      )}
    </div>
  );
}
