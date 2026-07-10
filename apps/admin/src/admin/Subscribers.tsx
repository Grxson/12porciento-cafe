import { useCallback, useEffect, useState } from 'react';
import { Search, X, Download } from 'lucide-react';
import { exportToCsv } from './utils/csvExport';
import { subscriptionsApi, productsApi } from '../api';
import SearchableProductSelect from '../components/SearchableProductSelect';
import ConfirmDialog from './components/ConfirmDialog';
import AdminModal from './components/AdminModal';
import type { Product, Subscription, SubscriptionStatus } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import Pagination from './components/Pagination';
import { PageMeta } from '../hooks/usePageMeta';
import { getApiError } from '@12porciento/shared';

function FulfillmentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDIENTE:
      'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-600 dark:border-yellow-500/30',
    PREPARANDO:
      'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/20 border-blue-600 dark:border-blue-500/30',
    ENVIADO:
      'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-500/30',
    ENTREGADO:
      'text-coffee-600 dark:text-coffee-300 bg-coffee-100 dark:bg-coffee-800/40 border-coffee-300 dark:border-coffee-700',
  };
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente',
    PREPARANDO: 'Preparando',
    ENVIADO: 'Enviado',
    ENTREGADO: 'Entregado',
  };
  return (
    <span
      className={`text-xs px-2 py-0.5 border rounded-sm whitespace-nowrap ${styles[status] ?? styles.PENDIENTE}`}
    >
      {labels[status] ?? status}
    </span>
  );
}

const statusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  ACTIVE: { label: 'Activa', color: 'text-green-600 dark:text-green-400' },
  PAUSED: { label: 'Pausada', color: 'text-yellow-700 dark:text-yellow-400' },
  CANCELLED: { label: 'Cancelada', color: 'text-red-600 dark:text-red-400' },
};

const planLabels: Record<string, string> = {
  FUNDADOR: 'Fundador',
  EXPLORADOR: 'Explorador',
  CONNOISSEUR: 'Connoisseur',
  EMPRESARIAL: 'Empresarial',
};

const PLAN_SLOTS: Record<string, { min: number; max: number }> = {
  FUNDADOR: { min: 2, max: 2 },
  EXPLORADOR: { min: 2, max: 3 },
  CONNOISSEUR: { min: 3, max: 3 },
  EMPRESARIAL: { min: 10, max: 99 },
};

const SELECT_CLASS =
  'bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500';

interface EditModalProps {
  sub: Subscription;
  onClose: () => void;
  onSaved: () => void;
}

function EditModal({ sub, onClose, onSaved }: EditModalProps) {
  const { addToast } = useModuleToast();

  const [plan, setPlan] = useState<string>(sub.plan);
  const [frequency, setFrequency] = useState<string>(sub.frequency ?? 'monthly');
  const [grindPreference, setGrindPreference] = useState<string>(sub.grindPreference ?? 'GRANO');
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>(
    sub.items ? sub.items.map((it) => it.productId) : [],
  );
  const [productToAdd, setProductToAdd] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingProducts(true);
    productsApi
      .adminList()
      .then((r) => {
        // adminList returns the bare array directly
        const list = Array.isArray(r.data)
          ? (r.data as Product[])
          : ((r.data as { data: Product[] })?.data ?? []);
        setProducts(list);
        if (list.length > 0) {
          const firstNotSelected = list.find((p) => !selectedItemIds.includes(p.id));
          setProductToAdd(firstNotSelected?.id ?? list[0].id);
        }
      })
      .catch(() => addToast('No se pudieron cargar los productos.', 'error'))
      .finally(() => setLoadingProducts(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const slots = PLAN_SLOTS[plan] ?? { min: 1, max: 99 };
  const countValid = selectedItemIds.length >= slots.min && selectedItemIds.length <= slots.max;

  const addProduct = () => {
    if (!productToAdd) return;
    if (selectedItemIds.includes(productToAdd)) return; // no duplicates
    const newSelected = [...selectedItemIds, productToAdd];
    setSelectedItemIds(newSelected);
    // Move selector to next unselected product (use the post-add array, not stale state)
    const next = products.find((p) => !newSelected.includes(p.id));
    setProductToAdd(next ? next.id : '');
  };

  const removeProduct = (pid: string) => {
    setSelectedItemIds((prev) => prev.filter((id) => id !== pid));
  };

  const getProductName = (pid: string) => {
    const p = products.find((pr) => pr.id === pid);
    return p?.name ?? pid;
  };

  const handleSave = async () => {
    if (!countValid) {
      addToast(
        `El plan ${planLabels[plan] ?? plan} requiere entre ${slots.min} y ${slots.max} cafés.`,
        'error',
      );
      return;
    }
    setSaving(true);
    try {
      await subscriptionsApi.adminUpdate(sub.id, {
        plan,
        frequency,
        grindPreference,
        items: selectedItemIds,
      });
      addToast('Suscripción actualizada correctamente.', 'success');
      onSaved();
      onClose();
    } catch (err: unknown) {
      const msg = getApiError(err, 'Error al guardar cambios.');
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminModal
      open
      title="Editar suscripción"
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-3 flex-1">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-200 dark:border-coffee-700 hover:border-coffee-400 dark:hover:border-coffee-600 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !countValid}
            className="px-4 py-2 text-sm bg-gold-600 text-coffee-950 font-medium hover:bg-gold-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      }
    >
      <p className="text-coffee-600 dark:text-coffee-400 text-xs mb-4">
        {sub.name} · {sub.email}
      </p>
      <div className="space-y-4">
        {/* Plan */}
        <div>
          <label
            htmlFor="subscriber-plan"
            className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1"
          >
            Plan
          </label>
          <select
            id="subscriber-plan"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className={`w-full ${SELECT_CLASS}`}
          >
            {Object.entries(planLabels).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Frequency */}
        <div>
          <label
            htmlFor="subscriber-frequency"
            className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1"
          >
            Frecuencia
          </label>
          <select
            id="subscriber-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className={`w-full ${SELECT_CLASS}`}
          >
            <option value="monthly">Mensual</option>
            <option value="bimonthly">Bimestral</option>
          </select>
        </div>

        {/* Grind */}
        <div>
          <label
            htmlFor="subscriber-grind"
            className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1"
          >
            Molienda
          </label>
          <select
            id="subscriber-grind"
            value={grindPreference}
            onChange={(e) => setGrindPreference(e.target.value)}
            className={`w-full ${SELECT_CLASS}`}
          >
            <option value="GRANO">Grano</option>
            <option value="MOLIDO">Molido</option>
          </select>
        </div>

        {/* Coffee items */}
        <div>
          <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">
            Cafés seleccionados
          </label>

          {/* Slot hint */}
          <p
            className={`text-xs mb-2 ${countValid ? 'text-coffee-600 dark:text-coffee-400' : 'text-red-400'}`}
          >
            El plan {planLabels[plan] ?? plan} requiere entre {slots.min} y {slots.max} cafés —
            actualmente {selectedItemIds.length}
          </p>

          {/* Selected chips */}
          {selectedItemIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {selectedItemIds.map((pid) => (
                <span
                  key={pid}
                  className="flex items-center gap-1 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 px-2 py-0.5 text-xs text-coffee-900 dark:text-cream"
                >
                  {getProductName(pid)}
                  <button
                    onClick={() => removeProduct(pid)}
                    className="text-coffee-500 dark:text-coffee-400 hover:text-red-400 transition-colors ml-1 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* Add product row */}
          {loadingProducts ? (
            <p className="text-xs text-coffee-500 dark:text-coffee-400">Cargando productos…</p>
          ) : (
            <div className="flex gap-2">
              <div className="flex-1">
                <SearchableProductSelect
                  value={productToAdd}
                  onChange={(id) => setProductToAdd(id)}
                  initialLabel="-- Seleccionar producto --"
                  excludeIds={selectedItemIds}
                />
              </div>
              <button
                onClick={addProduct}
                disabled={
                  !productToAdd ||
                  products.filter((p) => !selectedItemIds.includes(p.id)).length === 0
                }
                className="px-3 py-2 text-xs bg-coffee-200 dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-700 text-gold-500 hover:border-gold-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Agregar
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminModal>
  );
}

export default function AdminSubscribers() {
  const { addToast } = useModuleToast();

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filter, setFilter] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; name: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const load = useCallback(
    (p: number) => {
      setLoading(true);
      setLoadError('');
      const params: Record<string, string> = { page: String(p) };
      if (filter) params.status = filter;
      if (debouncedSearch) params.search = debouncedSearch;
      subscriptionsApi
        .list(params)
        .then((r) => {
          setSubs(r.data.data);
          setTotalPages(r.data.totalPages ?? 1);
        })
        .catch(() => {
          setLoadError('Error al cargar suscriptores. Intenta de nuevo.');
        })
        .finally(() => setLoading(false));
    },
    [filter, debouncedSearch],
  );

  useEffect(() => {
    load(page);
  }, [load, page]);

  // Debounce search → reset to page 1
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const confirmCancel = async () => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await subscriptionsApi.updateStatus(cancelConfirm.id, 'CANCELLED');
      setCancelConfirm(null);
      addToast('Suscripción cancelada.', 'success');
      load(page);
    } catch {
      addToast('Error al cancelar la suscripción.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const prev = subs;
    // Optimistic: reflect the new status immediately, revert on failure
    setSubs((list) =>
      list.map((s) => (s.id === id ? { ...s, status: status as SubscriptionStatus } : s)),
    );
    try {
      await subscriptionsApi.updateStatus(id, status);
      addToast(status === 'ACTIVE' ? 'Suscripción activada.' : 'Suscripción pausada.', 'success');
    } catch {
      setSubs(prev);
      addToast('Error al actualizar el estado.', 'error');
    }
  };

  const updateFulfillment = async (id: string, fulfillmentStatus: string) => {
    try {
      await subscriptionsApi.updateFulfillment(id, fulfillmentStatus);
      addToast('Estado de entrega actualizado.', 'success');
      load(page);
    } catch {
      addToast('Error al actualizar el estado de entrega.', 'error');
    }
  };

  const active = subs.filter((s) => s.status === 'ACTIVE').length;
  const paused = subs.filter((s) => s.status === 'PAUSED').length;

  const handleExportCsv = () => {
    exportToCsv(subs, 'suscriptores', [
      { key: 'name', label: 'Nombre' },
      { key: 'email', label: 'Email' },
      { key: 'plan', label: 'Plan' },
      { key: 'status', label: 'Estado' },
      { key: 'frequency', label: 'Frecuencia' },
      { key: 'grindPreference', label: 'Molienda' },
      { key: 'nextBilling', label: 'Próximo cobro' },
      { key: 'fulfillmentStatus', label: 'Envío' },
      { key: 'createdAt', label: 'Creado' },
    ]);
  };

  return (
    <div>
      <PageMeta title="Suscriptores" noSuffix />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Suscriptores</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mt-1">
            {active} activas · {paused} pausadas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3 py-2 border border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 text-sm hover:text-coffee-900 dark:hover:text-cream hover:border-coffee-400 dark:hover:border-coffee-500 transition-colors"
            title="Exportar CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none"
          >
            <option value="">Todas</option>
            <option value="ACTIVE">Activas</option>
            <option value="PAUSED">Pausadas</option>
            <option value="CANCELLED">Canceladas</option>
          </select>
        </div>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre o email..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-9 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700 dark:hover:text-cream transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {loading ? (
        <AdminSkeleton rows={5} />
      ) : loadError ? (
        <AdminErrorState error={loadError} onRetry={() => load(page)} />
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay suscriptores con ese filtro.</div>
      ) : (
        <>
          <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-coffee-200 dark:border-coffee-800">
                    <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Nombre
                    </th>
                    <th className="hidden sm:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Email
                    </th>
                    <th className="hidden sm:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Plan
                    </th>
                    <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Molienda
                    </th>
                    <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Frecuencia
                    </th>
                    <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Próximo cobro
                    </th>
                    <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Estado
                    </th>
                    <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Entrega
                    </th>
                    <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Cafés
                    </th>
                    <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3 bg-coffee-100 dark:bg-coffee-900">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((sub) => {
                    const cfg =
                      statusConfig[sub.status as SubscriptionStatus] ?? statusConfig.ACTIVE;
                    return (
                      <tr
                        key={sub.id}
                        className="border-b border-coffee-200/50 dark:border-coffee-800/50 bg-white dark:bg-coffee-800 hover:bg-coffee-50 dark:hover:bg-coffee-700 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <p className="text-coffee-900 dark:text-cream font-medium">{sub.name}</p>
                          {sub.phone && <p className="text-coffee-500 text-xs">{sub.phone}</p>}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3 text-coffee-700 dark:text-coffee-300">
                          {sub.email}
                        </td>
                        <td className="hidden sm:table-cell px-4 py-3">
                          <span className="text-gold-500 text-xs font-medium uppercase tracking-wider">
                            {planLabels[sub.plan] ?? sub.plan}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          <span className="text-xs px-2 py-0.5 border border-coffee-200 dark:border-coffee-700 bg-coffee-100 dark:bg-coffee-800/40 text-coffee-700 dark:text-coffee-300 rounded-sm uppercase tracking-wider">
                            {sub.grindPreference || 'GRANO'}
                          </span>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-coffee-700 dark:text-coffee-300 capitalize">
                          {sub.frequency === 'monthly' ? 'Mensual' : 'Bimestral'}
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3 text-coffee-700 dark:text-coffee-300">
                          {new Date(sub.nextBilling).toLocaleDateString('es-MX')}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <FulfillmentBadge status={sub.fulfillmentStatus ?? 'PENDIENTE'} />
                            <select
                              value={sub.fulfillmentStatus ?? 'PENDIENTE'}
                              onChange={async (e) => {
                                await updateFulfillment(sub.id, e.target.value);
                              }}
                              className="text-xs bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-2 py-1 focus:outline-none focus:border-gold-500"
                            >
                              {['PENDIENTE', 'PREPARANDO', 'ENVIADO', 'ENTREGADO'].map((s) => (
                                <option key={s} value={s}>
                                  {s}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-4 py-3">
                          {sub.items && sub.items.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {sub.items.map((item) => (
                                <div
                                  key={item.id}
                                  className="flex items-center gap-1 bg-coffee-200 dark:bg-coffee-800 px-2 py-0.5"
                                >
                                  <img
                                    src={item.product?.imageUrl}
                                    className="w-4 h-4 object-cover"
                                    alt=""
                                  />
                                  <span className="text-xs text-coffee-700 dark:text-coffee-300 truncate max-w-[80px]">
                                    {item.product?.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2 flex-wrap">
                            <button
                              onClick={() => setEditingSub(sub)}
                              className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                            >
                              Editar
                            </button>
                            {sub.status !== 'ACTIVE' && (
                              <button
                                onClick={() => updateStatus(sub.id, 'ACTIVE')}
                                className="text-xs text-green-600 dark:text-green-400 hover:text-green-500 dark:hover:text-green-300 transition-colors"
                              >
                                Activar
                              </button>
                            )}
                            {sub.status === 'ACTIVE' && (
                              <button
                                onClick={() => updateStatus(sub.id, 'PAUSED')}
                                className="text-xs text-yellow-700 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
                              >
                                Pausar
                              </button>
                            )}
                            {sub.status !== 'CANCELLED' && (
                              <button
                                onClick={() => setCancelConfirm({ id: sub.id, name: sub.name })}
                                className="text-xs text-red-400 hover:text-red-300 transition-colors"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <Pagination page={page} totalPages={totalPages} onChange={(p) => load(p)} />
        </>
      )}

      {editingSub && (
        <EditModal
          sub={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={() => load(page)}
        />
      )}

      <ConfirmDialog
        open={!!cancelConfirm}
        title="Cancelar suscripción"
        message={`¿Cancelar la suscripción de ${cancelConfirm?.name}? El suscriptor perderá acceso al siguiente envío.`}
        confirmText="Sí, cancelar"
        isDangerous
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelConfirm(null)}
      />
    </div>
  );
}
