import { useState, useCallback, useEffect } from 'react';
import { Briefcase, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { b2bApi } from '../api';
import { B2BProduct, B2BPriceTier } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import Pagination from './components/Pagination';

type Tab = 'tiers' | 'orders';

export default function AdminB2BOrders() {
  const { addToast } = useModuleToast();
  const [tab, setTab] = useState<Tab>('tiers');

  // Tiers state
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [tiersLoading, setTiersLoading] = useState(true);
  const [tiersError, setTiersError] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [productTiers, setProductTiers] = useState<Record<string, B2BPriceTier[]>>({});
  const [newTierForm, setNewTierForm] = useState<
    Record<string, { minQty: string; maxQty: string; pricePerUnit: string }>
  >({});
  const [savingTier, setSavingTier] = useState<string | null>(null);
  const [confirmDeleteTier, setConfirmDeleteTier] = useState<B2BPriceTier | null>(null);

  // Orders state
  const [orders, setOrders] = useState<unknown[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  const fetchProducts = useCallback(async () => {
    setTiersLoading(true);
    setTiersError(null);
    try {
      const res = await b2bApi.catalog();
      setProducts(res.data.data);
    } catch {
      setTiersError('Error al cargar catálogo B2B');
    } finally {
      setTiersLoading(false);
    }
  }, []);

  const fetchOrders = useCallback(async (p: number) => {
    setOrdersLoading(true);
    setOrdersError(null);
    try {
      const res = await b2bApi.orders({ page: p });
      setOrders(res.data.data);
      setOrdersTotalPages(res.data.totalPages);
      setOrdersPage(p);
    } catch {
      setOrdersError('Error al cargar pedidos B2B');
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggleProduct = async (productId: string) => {
    if (expandedProduct === productId) {
      setExpandedProduct(null);
      return;
    }
    setExpandedProduct(productId);
    if (!productTiers[productId]) {
      try {
        const res = await b2bApi.getTiers(productId);
        setProductTiers((t) => ({ ...t, [productId]: res.data.data }));
      } catch {
        addToast('Error al cargar tiers', 'error');
      }
    }
  };

  const handleAddTier = async (productId: string) => {
    const form = newTierForm[productId] ?? { minQty: '', maxQty: '', pricePerUnit: '' };
    if (!form.minQty || !form.pricePerUnit) {
      addToast('Cantidad mínima y precio son requeridos', 'error');
      return;
    }
    setSavingTier(productId);
    try {
      await b2bApi.createTier(productId, {
        minQty: parseInt(form.minQty),
        maxQty: form.maxQty ? parseInt(form.maxQty) : undefined,
        pricePerUnit: parseFloat(form.pricePerUnit),
      });
      addToast('Tier agregado', 'success');
      setNewTierForm((f) => ({ ...f, [productId]: { minQty: '', maxQty: '', pricePerUnit: '' } }));
      const res = await b2bApi.getTiers(productId);
      setProductTiers((t) => ({ ...t, [productId]: res.data.data }));
    } catch {
      addToast('Error al agregar tier', 'error');
    } finally {
      setSavingTier(null);
    }
  };

  const handleDeleteTier = async () => {
    if (!confirmDeleteTier) return;
    try {
      await b2bApi.deleteTier(confirmDeleteTier.id);
      addToast('Tier eliminado', 'success');
      const productId = confirmDeleteTier.productId;
      setConfirmDeleteTier(null);
      const res = await b2bApi.getTiers(productId);
      setProductTiers((t) => ({ ...t, [productId]: res.data.data }));
    } catch {
      addToast('Error al eliminar tier', 'error');
    }
  };

  const tabSwitch = (t: Tab) => {
    setTab(t);
    if (t === 'orders' && orders.length === 0) fetchOrders(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Canal B2B</h1>
        <p className="text-coffee-600 dark:text-cream/60 text-sm mt-1">
          Gestión de precios por volumen y pedidos empresariales
        </p>
      </div>

      <div className="flex gap-1 border-b border-coffee-200 dark:border-coffee-700">
        {(
          [
            ['tiers', 'Precios por Volumen'],
            ['orders', 'Pedidos B2B'],
          ] as [Tab, string][]
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => tabSwitch(id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === id
                ? 'border-coffee-800 text-coffee-800 dark:border-cream dark:text-cream'
                : 'border-transparent text-coffee-500 hover:text-coffee-700 dark:text-cream/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tiers' && (
        <>
          {tiersLoading ? (
            <AdminSkeleton rows={5} />
          ) : tiersError ? (
            <AdminErrorState error={tiersError} onRetry={fetchProducts} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className={`bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 overflow-hidden transition-all duration-200 ${expandedProduct === p.id ? 'md:col-span-2' : ''}`}
                >
                  <div className="flex items-center justify-between p-3 md:p-4 gap-3">
                    <div className="min-w-0">
                      <p className="font-medium text-coffee-900 dark:text-cream truncate">
                        {p.name}
                      </p>
                      <p className="text-sm text-coffee-500 dark:text-cream/50">
                        {p.b2bPriceTiers.length} tier{p.b2bPriceTiers.length !== 1 ? 's' : ''}{' '}
                        configurado{p.b2bPriceTiers.length !== 1 ? 's' : ''}
                        {p.weight && ` · ${p.weight}g`}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleProduct(p.id)}
                      className="p-1.5 text-coffee-400 hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                    >
                      {expandedProduct === p.id ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>

                  {expandedProduct === p.id && (
                    <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-4">
                      {/* Existing tiers */}
                      {(productTiers[p.id] ?? p.b2bPriceTiers).length > 0 && (
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-xs text-coffee-500 dark:text-cream/50 text-left">
                              <th className="pb-2">Mín qty</th>
                              <th className="pb-2">Máx qty</th>
                              <th className="pb-2">Precio/u</th>
                              <th className="pb-2"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-coffee-100 dark:divide-coffee-700">
                            {(productTiers[p.id] ?? p.b2bPriceTiers).map((tier) => (
                              <tr key={tier.id}>
                                <td className="py-1.5 text-coffee-900 dark:text-cream">
                                  {tier.minQty}
                                </td>
                                <td className="py-1.5 text-coffee-900 dark:text-cream">
                                  {tier.maxQty ?? '∞'}
                                </td>
                                <td className="py-1.5 text-coffee-900 dark:text-cream font-medium">
                                  ${tier.pricePerUnit.toFixed(2)}
                                </td>
                                <td className="py-1.5">
                                  <button
                                    onClick={() => setConfirmDeleteTier(tier)}
                                    className="p-1 text-red-400 hover:text-red-600 rounded"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* Add new tier */}
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-coffee-600 dark:text-cream/60 uppercase tracking-wide">
                          Agregar tier
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          {[
                            { key: 'minQty', label: 'Mín qty', placeholder: '10' },
                            { key: 'maxQty', label: 'Máx qty', placeholder: '50 (opcional)' },
                            { key: 'pricePerUnit', label: 'Precio/u ($)', placeholder: '89.00' },
                          ].map(({ key, label, placeholder }) => (
                            <div key={key} className="flex-1 min-w-[100px]">
                              <label className="text-xs text-coffee-500 dark:text-cream/50">
                                {label}
                              </label>
                              <input
                                type="number"
                                placeholder={placeholder}
                                value={
                                  (newTierForm[p.id] ?? {})[
                                    key as keyof (typeof newTierForm)[string]
                                  ] ?? ''
                                }
                                onChange={(e) =>
                                  setNewTierForm((f) => ({
                                    ...f,
                                    [p.id]: {
                                      ...(f[p.id] ?? { minQty: '', maxQty: '', pricePerUnit: '' }),
                                      [key]: e.target.value,
                                    },
                                  }))
                                }
                                className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                              />
                            </div>
                          ))}
                          <div className="flex items-end">
                            <button
                              onClick={() => handleAddTier(p.id)}
                              disabled={savingTier === p.id}
                              className="flex items-center gap-1 text-sm bg-coffee-800 text-cream px-3 py-1.5 rounded-lg hover:bg-coffee-900 disabled:opacity-50"
                            >
                              <Plus className="w-3.5 h-3.5" /> Agregar
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'orders' && (
        <>
          {ordersLoading ? (
            <AdminSkeleton rows={5} />
          ) : ordersError ? (
            <AdminErrorState error={ordersError} onRetry={() => fetchOrders(ordersPage)} />
          ) : orders.length === 0 ? (
            <div className="text-center py-12 text-coffee-500 dark:text-cream/50">
              <Briefcase className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay pedidos B2B registrados</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(
                orders as Array<{
                  id: string;
                  businessName?: string;
                  customerName: string;
                  total: number;
                  status: string;
                  createdAt: string;
                  orderType: string;
                  rfc?: string;
                  paymentTerms?: string;
                }>
              ).map((order) => (
                <div
                  key={order.id}
                  className="bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-coffee-900 dark:text-cream">
                        {order.businessName || order.customerName}
                      </p>
                      {order.rfc && (
                        <p className="text-xs text-coffee-500 dark:text-cream/50">
                          RFC: {order.rfc}
                        </p>
                      )}
                      {order.paymentTerms && (
                        <p className="text-xs text-coffee-500 dark:text-cream/50">
                          Términos: {order.paymentTerms}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-coffee-900 dark:text-cream">
                        ${order.total.toFixed(2)}
                      </p>
                      <p className="text-xs text-coffee-500 dark:text-cream/50">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination page={ordersPage} totalPages={ordersTotalPages} onChange={fetchOrders} />
        </>
      )}

      <ConfirmDialog
        open={!!confirmDeleteTier}
        title="Eliminar Tier"
        message={
          confirmDeleteTier
            ? `¿Eliminar tier de ${confirmDeleteTier.minQty}+ unidades a $${confirmDeleteTier.pricePerUnit}?`
            : ''
        }
        confirmText="Eliminar"
        isDangerous
        onConfirm={handleDeleteTier}
        onCancel={() => setConfirmDeleteTier(null)}
      />
    </div>
  );
}
