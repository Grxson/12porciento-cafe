import { useEffect, useState } from 'react';
import { subscriptionsApi, productsApi } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import type { Subscription, SubscriptionStatus } from '../types';
import { useModuleToast } from './context/ModuleContext';

function FulfillmentBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDIENTE:  'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
    PREPARANDO: 'text-blue-400 bg-blue-900/20 border-blue-500/30',
    ENVIADO:    'text-green-400 bg-green-900/20 border-green-500/30',
    ENTREGADO:  'text-coffee-300 bg-coffee-800/40 border-coffee-700',
  };
  const labels: Record<string, string> = {
    PENDIENTE: 'Pendiente', PREPARANDO: 'Preparando', ENVIADO: 'Enviado', ENTREGADO: 'Entregado',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 border rounded-sm whitespace-nowrap ${styles[status] ?? styles.PENDIENTE}`}>
      {labels[status] ?? status}
    </span>
  );
}

const statusConfig: Record<SubscriptionStatus, { label: string; color: string }> = {
  ACTIVE:    { label: 'Activa',     color: 'text-green-400' },
  PAUSED:    { label: 'Pausada',    color: 'text-yellow-400' },
  CANCELLED: { label: 'Cancelada',  color: 'text-red-400' },
};

const planLabels: Record<string, string> = {
  FUNDADOR:    'Fundador',
  EXPLORADOR:  'Explorador',
  CONNOISSEUR: 'Connoisseur',
  EMPRESARIAL: 'Empresarial',
};

const PLAN_SLOTS: Record<string, { min: number; max: number }> = {
  FUNDADOR:    { min: 2, max: 2 },
  EXPLORADOR:  { min: 2, max: 3 },
  CONNOISSEUR: { min: 3, max: 3 },
  EMPRESARIAL: { min: 10, max: 99 },
};

const SELECT_CLASS = 'bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500';

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
    sub.items ? sub.items.map((it: any) => it.productId) : [],
  );
  const [productToAdd, setProductToAdd] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoadingProducts(true);
    productsApi.adminList()
      .then((r) => {
        // adminList returns the bare array directly
        const list = Array.isArray(r.data) ? r.data : (r.data as any)?.data ?? [];
        setProducts(list);
        if (list.length > 0) {
          const firstNotSelected = list.find((p: any) => !selectedItemIds.includes(p.id));
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
    const next = products.find((p: any) => !newSelected.includes(p.id));
    setProductToAdd(next ? next.id : '');
  };

  const removeProduct = (pid: string) => {
    setSelectedItemIds((prev) => prev.filter((id) => id !== pid));
  };

  const getProductName = (pid: string) => {
    const p = products.find((pr: any) => pr.id === pid);
    return p?.name ?? pid;
  };

  const handleSave = async () => {
    if (!countValid) {
      addToast(`El plan ${planLabels[plan] ?? plan} requiere entre ${slots.min} y ${slots.max} cafés.`, 'error');
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
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Error al guardar cambios.';
      addToast(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-coffee-900 border border-coffee-700 max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-serif text-xl text-cream">Editar suscripción</h2>
            <p className="text-coffee-400 text-xs mt-0.5">{sub.name} · {sub.email}</p>
          </div>
          <button
            onClick={onClose}
            className="text-coffee-500 hover:text-cream transition-colors text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="space-y-4">
          {/* Plan */}
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-wider mb-1">Plan</label>
            <select value={plan} onChange={(e) => setPlan(e.target.value)} className={`w-full ${SELECT_CLASS}`}>
              {Object.entries(planLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-wider mb-1">Frecuencia</label>
            <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={`w-full ${SELECT_CLASS}`}>
              <option value="monthly">Mensual</option>
              <option value="bimonthly">Bimestral</option>
            </select>
          </div>

          {/* Grind */}
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-wider mb-1">Molienda</label>
            <select value={grindPreference} onChange={(e) => setGrindPreference(e.target.value)} className={`w-full ${SELECT_CLASS}`}>
              <option value="GRANO">Grano</option>
              <option value="MOLIDO">Molido</option>
            </select>
          </div>

          {/* Coffee items */}
          <div>
            <label className="block text-xs text-coffee-400 uppercase tracking-wider mb-1">Cafés seleccionados</label>

            {/* Slot hint */}
            <p className={`text-xs mb-2 ${countValid ? 'text-coffee-400' : 'text-red-400'}`}>
              El plan {planLabels[plan] ?? plan} requiere entre {slots.min} y {slots.max} cafés
              {' '}— actualmente {selectedItemIds.length}
            </p>

            {/* Selected chips */}
            {selectedItemIds.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {selectedItemIds.map((pid) => (
                  <span key={pid} className="flex items-center gap-1 bg-coffee-800 border border-coffee-700 px-2 py-0.5 text-xs text-cream">
                    {getProductName(pid)}
                    <button
                      onClick={() => removeProduct(pid)}
                      className="text-coffee-500 hover:text-red-400 transition-colors ml-1 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Add product row */}
            {loadingProducts ? (
              <p className="text-xs text-coffee-500">Cargando productos…</p>
            ) : (
              <div className="flex gap-2">
                <select
                  value={productToAdd}
                  onChange={(e) => setProductToAdd(e.target.value)}
                  className={`flex-1 ${SELECT_CLASS}`}
                >
                  {products
                    .filter((p: any) => !selectedItemIds.includes(p.id))
                    .map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                </select>
                <button
                  onClick={addProduct}
                  disabled={!productToAdd || products.filter((p: any) => !selectedItemIds.includes(p.id)).length === 0}
                  className="px-3 py-2 text-xs bg-coffee-800 border border-coffee-700 text-gold-500 hover:border-gold-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Agregar
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-coffee-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-coffee-400 hover:text-cream border border-coffee-700 hover:border-coffee-600 transition-colors"
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
      </div>
    </div>
  );
}

export default function AdminSubscribers() {
  const { addToast } = useModuleToast();

  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [filter, setFilter] = useState('');
  const [cancelConfirm, setCancelConfirm] = useState<{ id: string; name: string } | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [editingSub, setEditingSub] = useState<Subscription | null>(null);

  const load = () => {
    setLoading(true);
    setLoadError('');
    const params: Record<string, string> | undefined = filter ? { status: filter } : undefined;
    subscriptionsApi.list(params)
      .then((r) => { setSubs(r.data); })
      .catch(() => { setLoadError('Error al cargar suscriptores. Intenta de nuevo.'); })
      .finally(() => setLoading(false));
  };

  const confirmCancel = async () => {
    if (!cancelConfirm) return;
    setCancelling(true);
    try {
      await subscriptionsApi.updateStatus(cancelConfirm.id, 'CANCELLED');
      setCancelConfirm(null);
      addToast('Suscripción cancelada.', 'success');
      load();
    } catch {
      addToast('Error al cancelar la suscripción.', 'error');
    } finally { setCancelling(false); }
  };

  useEffect(load, [filter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await subscriptionsApi.updateStatus(id, status);
      addToast(status === 'ACTIVE' ? 'Suscripción activada.' : 'Suscripción pausada.', 'success');
      load();
    } catch {
      addToast('Error al actualizar el estado.', 'error');
    }
  };

  const updateFulfillment = async (id: string, fulfillmentStatus: string) => {
    try {
      await subscriptionsApi.updateFulfillment(id, fulfillmentStatus);
      addToast('Estado de entrega actualizado.', 'success');
      load();
    } catch {
      addToast('Error al actualizar el estado de entrega.', 'error');
    }
  };

  const active = subs.filter((s) => s.status === 'ACTIVE').length;
  const paused = subs.filter((s) => s.status === 'PAUSED').length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-serif text-3xl text-cream">Suscriptores</h1>
          <p className="text-coffee-400 text-sm mt-1">
            {active} activas · {paused} pausadas
          </p>
        </div>

        <select
          value={filter}
          onChange={(e) => { setFilter(e.target.value); setLoading(true); }}
          className="bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none"
        >
          <option value="">Todas</option>
          <option value="ACTIVE">Activas</option>
          <option value="PAUSED">Pausadas</option>
          <option value="CANCELLED">Canceladas</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      ) : loadError ? (
        <div className="text-center py-20">
          <p className="text-red-400 mb-4">{loadError}</p>
          <button onClick={load} className="text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 px-4 py-2 transition-colors">
            Reintentar
          </button>
        </div>
      ) : subs.length === 0 ? (
        <div className="text-center py-20 text-coffee-500">No hay suscriptores con ese filtro.</div>
      ) : (
        <div className="bg-coffee-900 border border-coffee-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-coffee-800">
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Nombre</th>
                  <th className="hidden sm:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Email</th>
                  <th className="hidden sm:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Plan</th>
                  <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Molienda</th>
                  <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Frecuencia</th>
                  <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Próximo cobro</th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Estado</th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Entrega</th>
                  <th className="hidden lg:table-cell text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Cafés</th>
                  <th className="text-left text-xs text-coffee-500 uppercase tracking-widest px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((sub) => {
                  const cfg = statusConfig[sub.status as SubscriptionStatus] ?? statusConfig.ACTIVE;
                  return (
                    <tr key={sub.id} className="border-b border-coffee-800/50 hover:bg-coffee-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-cream font-medium">{sub.name}</p>
                        {sub.phone && <p className="text-coffee-500 text-xs">{sub.phone}</p>}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-coffee-300">{sub.email}</td>
                      <td className="hidden sm:table-cell px-4 py-3">
                        <span className="text-gold-500 text-xs font-medium uppercase tracking-wider">
                          {planLabels[sub.plan] ?? sub.plan}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        <span className="text-[10px] px-2 py-0.5 border border-coffee-700 bg-coffee-800/40 text-coffee-300 rounded-sm uppercase tracking-wider">
                          {sub.grindPreference || 'GRANO'}
                        </span>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-coffee-300 capitalize">
                        {sub.frequency === 'monthly' ? 'Mensual' : 'Bimestral'}
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3 text-coffee-300">
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
                            className="text-xs bg-coffee-800 border border-coffee-700 text-cream px-2 py-1 focus:outline-none focus:border-gold-500"
                          >
                            {['PENDIENTE','PREPARANDO','ENVIADO','ENTREGADO'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="hidden lg:table-cell px-4 py-3">
                        {sub.items && sub.items.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {sub.items.map((item: any) => (
                              <div key={item.id} className="flex items-center gap-1 bg-coffee-800 px-2 py-0.5">
                                <img src={item.product?.imageUrl} className="w-4 h-4 object-cover" alt="" />
                                <span className="text-[10px] text-coffee-300 truncate max-w-[80px]">{item.product?.name}</span>
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
                              className="text-xs text-green-400 hover:text-green-300 transition-colors"
                            >
                              Activar
                            </button>
                          )}
                          {sub.status === 'ACTIVE' && (
                            <button
                              onClick={() => updateStatus(sub.id, 'PAUSED')}
                              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
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
      )}

      {editingSub && (
        <EditModal
          sub={editingSub}
          onClose={() => setEditingSub(null)}
          onSaved={load}
        />
      )}

      <ConfirmDialog
        open={!!cancelConfirm}
        title="Cancelar suscripción"
        description={`¿Cancelar la suscripción de ${cancelConfirm?.name}? El suscriptor perderá acceso al siguiente envío.`}
        confirmLabel="Sí, cancelar"
        confirmVariant="danger"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelConfirm(null)}
      />
    </div>
  );
}
