import { useState, useCallback, useEffect } from 'react';
import { Package, CheckCircle, XCircle, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { lotesApi } from '../api';
import { Lote, LoteFormData } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';

type Tab = 'cuarentena' | 'aprobados' | 'rechazados' | 'todos';

const TAB_STATUS: Record<Tab, string | undefined> = {
  cuarentena: 'CUARENTENA',
  aprobados: 'APROBADO',
  rechazados: 'RECHAZADO',
  todos: undefined,
};

const STATUS_BADGE: Record<string, string> = {
  CUARENTENA: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  APROBADO: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  RECHAZADO: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const EMPTY_FORM: LoteFormData = {
  productId: '',
  batchNumber: '',
  quantity: 0,
};

export default function AdminLotes() {
  const { addToast } = useModuleToast();
  const [tab, setTab] = useState<Tab>('cuarentena');
  const [lotes, setLotes] = useState<Lote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState<LoteFormData>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [qcForm, setQcForm] = useState<Record<string, string>>({});

  const [confirmApprove, setConfirmApprove] = useState<Lote | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Lote | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Lote | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchLotes = useCallback(async (p: number, t: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const status = TAB_STATUS[t];
      const res = await lotesApi.list({ status, page: p, pageSize: 20 });
      setLotes(res.data.data);
      setTotalPages(res.data.totalPages);
      setTotal(res.data.total);
      setPage(p);
    } catch {
      setError('Error al cargar lotes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLotes(1, 'cuarentena');
  }, [fetchLotes]);

  const changeTab = (t: Tab) => {
    setTab(t);
    fetchLotes(1, t);
  };

  const handleCreate = async () => {
    if (!form.productId || !form.batchNumber || !form.quantity) {
      addToast('Producto, número de lote y cantidad son requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      await lotesApi.create(form);
      addToast('Lote registrado en cuarentena', 'success');
      setShowCreate(false);
      setForm(EMPTY_FORM);
      fetchLotes(page, tab);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } }).response?.data?.error;
      addToast(msg || 'Error al crear lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveQc = async (lote: Lote) => {
    setSaving(true);
    try {
      const payload: Record<string, number | undefined> = {};
      [
        'humedad',
        'defectos',
        'scoreAroma',
        'scoreSabor',
        'scoreAcidez',
        'scoreBody',
        'scoreFinal',
      ].forEach((k) => {
        if (qcForm[k] !== undefined && qcForm[k] !== '') payload[k] = parseFloat(qcForm[k]);
      });
      if (qcForm.notes !== undefined) {
        await lotesApi.update(lote.id, { ...payload, notes: qcForm.notes } as Parameters<
          typeof lotesApi.update
        >[1]);
      } else {
        await lotesApi.update(lote.id, payload as Parameters<typeof lotesApi.update>[1]);
      }
      addToast('Evaluación guardada', 'success');
      fetchLotes(page, tab);
    } catch {
      addToast('Error al guardar evaluación', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!confirmApprove) return;
    setSaving(true);
    try {
      await lotesApi.aprobar(confirmApprove.id);
      addToast(`Lote ${confirmApprove.batchNumber} aprobado. Stock actualizado.`, 'success');
      setConfirmApprove(null);
      fetchLotes(page, tab);
    } catch {
      addToast('Error al aprobar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectTarget || !rejectReason.trim()) {
      addToast('Se requiere motivo de rechazo', 'error');
      return;
    }
    setSaving(true);
    try {
      await lotesApi.rechazar(rejectTarget.id, rejectReason.trim());
      addToast(`Lote ${rejectTarget.batchNumber} rechazado`, 'success');
      setRejectTarget(null);
      setRejectReason('');
      fetchLotes(page, tab);
    } catch {
      addToast('Error al rechazar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    setSaving(true);
    try {
      await lotesApi.delete(confirmDelete.id);
      addToast('Lote eliminado', 'success');
      setConfirmDelete(null);
      fetchLotes(page, tab);
    } catch {
      addToast('Error al eliminar lote', 'error');
    } finally {
      setSaving(false);
    }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'cuarentena', label: 'Cuarentena' },
    { id: 'aprobados', label: 'Aprobados' },
    { id: 'rechazados', label: 'Rechazados' },
    { id: 'todos', label: 'Todos' },
  ];

  return (
    <div className="space-y-6">
      <title>Gestión de Lotes</title>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Gestión de Lotes</h1>
          <p className="text-coffee-600 dark:text-cream/60 text-sm mt-1">
            {total} lote{total !== 1 ? 's' : ''} en vista actual
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-coffee-800 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" /> Registrar Lote
        </button>
      </div>

      <div className="flex gap-1 border-b border-coffee-200 dark:border-coffee-700">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => changeTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? 'border-coffee-800 text-coffee-800 dark:border-cream dark:text-cream'
                : 'border-transparent text-coffee-500 hover:text-coffee-700 dark:text-cream/50'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={() => fetchLotes(page, tab)} />
      ) : lotes.length === 0 ? (
        <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
          <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
          <p>No hay lotes en esta vista</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lotes.map((lote) => (
            <div
              key={lote.id}
              className={`bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 overflow-hidden transition-all duration-200 ${
                expandedId === lote.id ? 'md:col-span-2' : ''
              }`}
            >
              <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Package className="w-5 h-5 text-coffee-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-coffee-900 dark:text-cream truncate">
                      {lote.batchNumber}
                    </p>
                    <p className="text-sm text-coffee-500 dark:text-cream/60 truncate">
                      {lote.product.name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm text-coffee-600 dark:text-cream/70">
                    {lote.quantity} u.
                  </span>
                  {lote.origin && (
                    <span className="text-sm text-coffee-500 dark:text-cream/50 hidden sm:block">
                      {lote.origin}
                    </span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[lote.status]}`}
                  >
                    {lote.status}
                  </span>
                  {lote.status === 'CUARENTENA' && (
                    <>
                      <button
                        onClick={() => setConfirmApprove(lote)}
                        className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg"
                        title="Aprobar"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setRejectTarget(lote);
                          setRejectReason('');
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                        title="Rechazar"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    </>
                  )}
                  {lote.status === 'RECHAZADO' && (
                    <button
                      onClick={() => setConfirmDelete(lote)}
                      className="p-1.5 text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                      title="Eliminar"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setExpandedId(expandedId === lote.id ? null : lote.id);
                      setQcForm({});
                    }}
                    className="p-1.5 text-coffee-400 hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                  >
                    {expandedId === lote.id ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {expandedId === lote.id && (
                <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    {(
                      [
                        ['Proveedor', lote.supplier],
                        ['Origen', lote.origin],
                        ['Costo/kg', lote.costPerKg ? `$${lote.costPerKg}` : '—'],
                        [
                          'Vence',
                          lote.expiryDate
                            ? new Date(lote.expiryDate).toLocaleDateString('es-MX')
                            : '—',
                        ],
                      ] as [string, string | null][]
                    ).map(([label, val]) => (
                      <div key={label}>
                        <p className="text-coffee-500 dark:text-cream/50 text-xs">{label}</p>
                        <p className="text-coffee-900 dark:text-cream font-medium">{val || '—'}</p>
                      </div>
                    ))}
                  </div>

                  {lote.status === 'RECHAZADO' && lote.rejectionReason && (
                    <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                      <p className="text-xs text-red-600 dark:text-red-400 font-medium">
                        Motivo de rechazo
                      </p>
                      <p className="text-sm text-red-800 dark:text-red-300 mt-1">
                        {lote.rejectionReason}
                      </p>
                    </div>
                  )}

                  {lote.status === 'CUARENTENA' && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-coffee-700 dark:text-cream/70 uppercase tracking-wide">
                        Evaluación QC
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          {
                            key: 'humedad',
                            label: 'Humedad %',
                            placeholder: '11.5',
                            val: lote.humedad,
                          },
                          {
                            key: 'defectos',
                            label: 'Defectos',
                            placeholder: '3',
                            val: lote.defectos,
                          },
                          {
                            key: 'scoreAroma',
                            label: 'Aroma /10',
                            placeholder: '8.5',
                            val: lote.scoreAroma,
                          },
                          {
                            key: 'scoreSabor',
                            label: 'Sabor /10',
                            placeholder: '8.0',
                            val: lote.scoreSabor,
                          },
                          {
                            key: 'scoreAcidez',
                            label: 'Acidez /10',
                            placeholder: '7.5',
                            val: lote.scoreAcidez,
                          },
                          {
                            key: 'scoreBody',
                            label: 'Cuerpo /10',
                            placeholder: '8.0',
                            val: lote.scoreBody,
                          },
                          {
                            key: 'scoreFinal',
                            label: 'Score Final /100',
                            placeholder: '84',
                            val: lote.scoreFinal,
                          },
                        ].map(({ key, label, placeholder, val }) => (
                          <div key={key}>
                            <label className="text-xs text-coffee-600 dark:text-cream/60">
                              {label}
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              placeholder={placeholder}
                              defaultValue={val ?? ''}
                              onChange={(e) => setQcForm((f) => ({ ...f, [key]: e.target.value }))}
                              className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                            />
                          </div>
                        ))}
                      </div>
                      <div>
                        <label className="text-xs text-coffee-600 dark:text-cream/60">Notas</label>
                        <textarea
                          rows={2}
                          defaultValue={lote.notes ?? ''}
                          onChange={(e) => setQcForm((f) => ({ ...f, notes: e.target.value }))}
                          className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream resize-none"
                        />
                      </div>
                      <button
                        onClick={() => handleSaveQc(lote)}
                        disabled={saving}
                        className="text-sm bg-coffee-800 text-cream px-3 py-1.5 rounded-lg hover:bg-coffee-900 disabled:opacity-50 transition-colors"
                      >
                        Guardar evaluación
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} onChange={(p) => fetchLotes(p, tab)} />

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-lg shadow-xl">
            <div className="p-6 border-b border-coffee-100 dark:border-coffee-700">
              <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">
                Registrar Lote Entrante
              </h2>
            </div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {(
                [
                  { key: 'batchNumber', label: 'Número de Lote *', placeholder: 'LOT-2026-001' },
                  { key: 'productId', label: 'ID de Producto *', placeholder: 'ID del producto' },
                  {
                    key: 'quantity',
                    label: 'Cantidad (unidades) *',
                    placeholder: '100',
                    type: 'number',
                  },
                  {
                    key: 'costPerKg',
                    label: 'Costo por kg ($)',
                    placeholder: '85.00',
                    type: 'number',
                  },
                  {
                    key: 'unitCost',
                    label: 'Costo por unidad ($)',
                    placeholder: '45.00',
                    type: 'number',
                  },
                  { key: 'supplier', label: 'Proveedor', placeholder: 'Nombre del proveedor' },
                  { key: 'origin', label: 'Origen', placeholder: 'Chiapas, México' },
                  {
                    key: 'expiryDate',
                    label: 'Fecha de vencimiento',
                    placeholder: '',
                    type: 'date',
                  },
                  {
                    key: 'notes',
                    label: 'Notas iniciales',
                    placeholder: 'Observaciones al recibir...',
                  },
                ] as { key: string; label: string; placeholder: string; type?: string }[]
              ).map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                    {label}
                  </label>
                  <input
                    type={type || 'text'}
                    placeholder={placeholder}
                    value={(form as unknown as Record<string, string>)[key] ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                  />
                </div>
              ))}
            </div>
            <div className="p-6 border-t border-coffee-100 dark:border-coffee-700 flex gap-3 justify-end">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-coffee-600 dark:text-cream/60 hover:text-coffee-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="px-4 py-2 text-sm bg-coffee-800 text-cream rounded-lg hover:bg-coffee-900 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Registrar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-coffee-900 rounded-2xl w-full max-w-md shadow-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-coffee-900 dark:text-cream">Rechazar Lote</h2>
            <p className="text-sm text-coffee-600 dark:text-cream/60">
              Lote: <strong>{rejectTarget.batchNumber}</strong>
            </p>
            <div>
              <label className="block text-sm text-coffee-700 dark:text-cream/70 mb-1">
                Motivo de rechazo *
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Describe por qué se rechaza este lote..."
                className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream resize-none"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectTarget(null)}
                className="px-4 py-2 text-sm text-coffee-600 dark:text-cream/60 hover:text-coffee-900"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={saving || !rejectReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? 'Rechazando...' : 'Rechazar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!confirmApprove}
        title="Aprobar Lote"
        message={`¿Aprobar lote ${confirmApprove?.batchNumber}? Esto agregará ${confirmApprove?.quantity} unidades al inventario del producto.`}
        confirmText="Aprobar"
        onConfirm={handleApprove}
        onCancel={() => setConfirmApprove(null)}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Eliminar Lote"
        message={`¿Eliminar definitivamente el lote ${confirmDelete?.batchNumber}?`}
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
