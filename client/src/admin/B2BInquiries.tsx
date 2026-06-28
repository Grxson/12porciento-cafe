import { useState, useEffect } from 'react';
import { Search, Building2, Mail, Phone, Calendar, X, ChevronDown, Loader2, MessageCircle } from 'lucide-react';
import { subscriptionsApi } from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';
import { useModuleToast } from './context/ModuleContext';
import { PageMeta } from '../hooks/usePageMeta';

interface B2BInquiry {
  id: string;
  empresa: string;
  rfc: string;
  contactoNombre: string;
  contactoEmail?: string;
  contactoTelefono?: string;
  volumenEstimado?: string;
  giroNegocio?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NEW:       { label: 'Nuevo',       color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30' },
  CONTACTED: { label: 'Contactado',  color: 'text-blue-400 bg-blue-400/10 border-blue-400/30' },
  RESOLVED:  { label: 'Resuelto',    color: 'text-green-400 bg-green-400/10 border-green-400/30' },
};

const STATUS_OPTIONS = ['NEW', 'CONTACTED', 'RESOLVED'];

export default function B2BInquiries() {
  const { addToast } = useModuleToast();
  const [inquiries, setInquiries] = useState<B2BInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedInquiry, setSelectedInquiry] = useState<B2BInquiry | null>(null);
  const [updating, setUpdating] = useState(false);

  const doFetch = (p: number, status: string, q: string) => {
    setLoading(true);
    setLoadError('');
    const params: Record<string, string> = { page: String(p), pageSize: '50' };
    if (status) params.status = status;
    if (q) params.search = q;
    subscriptionsApi.b2bList(params)
      .then((r) => {
        const res = r.data as any;
        setInquiries(res.data ?? []);
        setTotalPages(res.totalPages ?? 1);
        setPage(p);
      })
      .catch(() => { setLoadError('Error al cargar consultas B2B. Intenta de nuevo.'); })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    doFetch(page, statusFilter, debouncedSearch);
  }, [page, statusFilter, debouncedSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleStatusUpdate = async (id: string, newStatus: string) => {
    setUpdating(true);
    try {
      await subscriptionsApi.b2bUpdateStatus(id, newStatus);
      setInquiries((prev) => prev.map((i) => (i.id === id ? { ...i, status: newStatus } : i)));
      if (selectedInquiry?.id === id) setSelectedInquiry((prev) => prev ? { ...prev, status: newStatus } : null);
      addToast(`Estado actualizado a ${STATUS_LABELS[newStatus]?.label ?? newStatus}`, 'success');
    } catch {
      addToast('Error al actualizar estado', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const statusTabs = ['', ...STATUS_OPTIONS];

  return (
    <div className="p-8">
      <PageMeta title="Consultas B2B" noSuffix />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Consultas B2B</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">{inquiries.length} consultas</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por empresa, contacto o email..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-6">
        {statusTabs.map((s) => (
          <button
            key={s}
            onClick={() => { setStatusFilter(s); setPage(1); }}
            className={`text-xs px-3 py-1.5 border transition-all ${
              statusFilter === s ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-500'
            }`}
          >
            {s ? STATUS_LABELS[s]?.label ?? s : 'Todos'}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminSkeleton rows={4} />
      ) : loadError ? (
        <AdminErrorState error={loadError} onRetry={() => doFetch(page, statusFilter, debouncedSearch)} />
      ) : inquiries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <MessageCircle className="w-12 h-12 text-coffee-300 dark:text-coffee-600 mb-4" />
          <p className="text-coffee-500 dark:text-coffee-400">No hay consultas B2B con este filtro.</p>
        </div>
      ) : (
        <>
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-coffee-200 dark:border-coffee-800">
                    {['Empresa', 'Contacto', 'Email', 'Volumen', 'Estado', 'Creado', ''].map((h) => (
                      <th key={h} className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {inquiries.map((inq) => (
                    <tr
                      key={inq.id}
                      className="border-b border-coffee-200/50 dark:border-coffee-800/50 hover:bg-coffee-200/30 dark:hover:bg-coffee-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedInquiry(selectedInquiry?.id === inq.id ? null : inq)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Building2 className="w-4 h-4 text-coffee-500 shrink-0" />
                          <span className="text-coffee-900 dark:text-cream font-medium">{inq.empresa}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-coffee-700 dark:text-coffee-300">{inq.contactoNombre}</td>
                      <td className="px-4 py-3">
                        <span className="text-coffee-600 dark:text-coffee-400 text-xs">{inq.contactoEmail || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-coffee-700 dark:text-coffee-300 text-xs">{inq.volumenEstimado || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 border font-medium ${STATUS_LABELS[inq.status]?.color ?? 'text-coffee-500'}`}>
                          {STATUS_LABELS[inq.status]?.label ?? inq.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-coffee-500 dark:text-coffee-400 text-xs">
                        {new Date(inq.createdAt).toLocaleDateString('es-MX')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedInquiry(selectedInquiry?.id === inq.id ? null : inq); }}
                          className="text-coffee-400 dark:text-coffee-500 hover:text-gold-500 transition-colors"
                        >
                          <ChevronDown className={`w-4 h-4 transition-transform ${selectedInquiry?.id === inq.id ? 'rotate-180' : ''}`} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={(p) => setPage(p)} />

          {/* Detail panel */}
          {selectedInquiry && (
            <div className="fixed inset-0 bg-coffee-950/60 flex items-start justify-center z-50 p-4 overflow-y-auto" onClick={() => setSelectedInquiry(null)}>
              <div
                className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 w-full max-w-lg my-12"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-5 border-b border-coffee-200 dark:border-coffee-800">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gold-500" />
                    <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">{selectedInquiry.empresa}</h2>
                  </div>
                  <button onClick={() => setSelectedInquiry(null)} className="text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">RFC</p>
                      <p className="text-coffee-900 dark:text-cream text-sm">{selectedInquiry.rfc || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">Giro negocio</p>
                      <p className="text-coffee-900 dark:text-cream text-sm">{selectedInquiry.giroNegocio || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">Contacto</p>
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-coffee-400" />
                        <p className="text-coffee-900 dark:text-cream text-sm">{selectedInquiry.contactoNombre}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">Email</p>
                      {selectedInquiry.contactoEmail ? (
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-coffee-400" />
                          <a href={`mailto:${selectedInquiry.contactoEmail}`} className="text-gold-500 hover:text-gold-400 text-sm">{selectedInquiry.contactoEmail}</a>
                        </div>
                      ) : <p className="text-coffee-500 text-sm">—</p>}
                    </div>
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">Teléfono</p>
                      {selectedInquiry.contactoTelefono ? (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-coffee-400" />
                          <a href={`tel:${selectedInquiry.contactoTelefono}`} className="text-coffee-900 dark:text-cream text-sm">{selectedInquiry.contactoTelefono}</a>
                        </div>
                      ) : <p className="text-coffee-500 text-sm">—</p>}
                    </div>
                    <div>
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-1">Volumen estimado</p>
                      <p className="text-coffee-900 dark:text-cream text-sm">{selectedInquiry.volumenEstimado || '—'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-coffee-500 dark:text-coffee-400">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Creado: {new Date(selectedInquiry.createdAt).toLocaleString('es-MX')}</span>
                  </div>

                  <div className="border-t border-coffee-200 dark:border-coffee-800 pt-4">
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-3">Estado</p>
                    <div className="flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map((s) => (
                        <button
                          key={s}
                          onClick={() => handleStatusUpdate(selectedInquiry.id, s)}
                          disabled={updating || selectedInquiry.status === s}
                          className={`text-xs px-3 py-1.5 border transition-all flex items-center gap-1.5 ${
                            selectedInquiry.status === s
                              ? `${STATUS_LABELS[s]?.color ?? ''} border-current`
                              : 'border-coffee-200 dark:border-coffee-700 text-coffee-500 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-500'
                          }`}
                        >
                          {updating && selectedInquiry.status !== s ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {STATUS_LABELS[s]?.label ?? s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
