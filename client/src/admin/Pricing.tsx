import { useState, useCallback, useEffect } from 'react';
import { DollarSign, AlertTriangle, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import { pricingApi } from '../api';
import { ProductWithPricing, PricingConfig } from '../types';
import { useModuleToast } from './context/ModuleContext';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';

const DEFAULT_CONFIG: Partial<PricingConfig> = {
  roastingCostPerUnit: 15,
  packagingCostPerUnit: 8,
  overheadFixed: 5,
  marginRetailPct: 60,
  marginB2bPct: 30,
  minAlertMarginPct: 20,
};

export default function AdminPricing() {
  const { addToast } = useModuleToast();
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [configForms, setConfigForms] = useState<Record<string, Partial<PricingConfig>>>({});
  const [saving, setSaving] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await pricingApi.list();
      setProducts(res.data.data);
    } catch {
      setError('Error al cargar precios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const getForm = (p: ProductWithPricing): Partial<PricingConfig> =>
    configForms[p.id] ?? (p.pricingConfig ? { ...p.pricingConfig } : { ...DEFAULT_CONFIG });

  const setField = (productId: string, key: string, value: string) => {
    setConfigForms((f) => ({
      ...f,
      [productId]: { ...(f[productId] ?? DEFAULT_CONFIG), [key]: parseFloat(value) || 0 },
    }));
  };

  const handleSave = async (p: ProductWithPricing) => {
    const form = getForm(p);
    setSaving(p.id);
    try {
      await pricingApi.save(p.id, form);
      addToast(`Precios guardados para ${p.name}`, 'success');
      fetchProducts();
    } catch {
      addToast('Error al guardar precios', 'error');
    } finally {
      setSaving(null);
    }
  };

  const alertProducts = products.filter((p) => {
    if (!p.calculated || !p.pricingConfig) return false;
    const actualMarginPct = ((p.price - p.calculated.totalCostPerUnit) / p.price) * 100;
    return actualMarginPct < p.pricingConfig.minAlertMarginPct;
  });

  const configFields = [
    { key: 'roastingCostPerUnit', label: 'Costo tostado/u', placeholder: '15' },
    { key: 'packagingCostPerUnit', label: 'Costo empaque/u', placeholder: '8' },
    { key: 'overheadFixed', label: 'Overhead fijo/u', placeholder: '5' },
    { key: 'marginRetailPct', label: 'Margen retail %', placeholder: '60' },
    { key: 'marginB2bPct', label: 'Margen B2B %', placeholder: '30' },
    { key: 'minAlertMarginPct', label: 'Alerta margen mín %', placeholder: '20' },
  ] as { key: string; label: string; placeholder: string }[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Motor de Precios</h1>
          <p className="text-coffee-600 dark:text-cream/60 text-sm mt-1">
            {products.length} productos activos
          </p>
        </div>
        <Calculator className="w-8 h-8 text-coffee-400 dark:text-cream/30" />
      </div>

      {alertProducts.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            <p className="font-medium text-amber-800 dark:text-amber-300 text-sm">
              {alertProducts.length} producto{alertProducts.length !== 1 ? 's' : ''} con margen bajo
            </p>
          </div>
          <ul className="text-sm text-amber-700 dark:text-amber-400 space-y-0.5">
            {alertProducts.map((p) => (
              <li key={p.id}>• {p.name}</li>
            ))}
          </ul>
        </div>
      )}

      {loading ? (
        <AdminSkeleton rows={6} />
      ) : error ? (
        <AdminErrorState error={error} onRetry={fetchProducts} />
      ) : (
        <div className="space-y-3">
          {products.map((p) => {
            const form = getForm(p);
            const isExpanded = expandedId === p.id;
            const calc = p.calculated;
            const hasAlert = alertProducts.some((a) => a.id === p.id);

            return (
              <div
                key={p.id}
                className={`bg-white dark:bg-coffee-900 rounded-xl border overflow-hidden ${hasAlert ? 'border-amber-300 dark:border-amber-700' : 'border-coffee-100 dark:border-coffee-700'}`}
              >
                <div className="flex items-center justify-between p-4 gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-coffee-900 dark:text-cream truncate">
                        {p.name}
                      </p>
                      {hasAlert && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-coffee-500 dark:text-cream/50 mt-0.5">
                      Precio actual: <strong>${p.price.toFixed(2)}</strong>
                      {p.costPrice && ` · Costo materia: $${p.costPrice.toFixed(2)}/kg`}
                      {p.weight && ` · ${p.weight}g`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-sm">
                    {calc ? (
                      <div className="text-right hidden sm:block">
                        <p className="text-green-600 dark:text-green-400 font-medium">
                          ${calc.suggestedRetailPrice.toFixed(2)} retail
                        </p>
                        <p className="text-coffee-500 dark:text-cream/50 text-xs">
                          ${calc.suggestedB2bPrice.toFixed(2)} B2B
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-coffee-400 dark:text-cream/30 hidden sm:block">
                        Sin config
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      className="p-1.5 text-coffee-400 hover:bg-coffee-50 dark:hover:bg-coffee-800 rounded-lg"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-4">
                    {!p.costPrice && (
                      <div className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
                        Este producto no tiene costo de materia prima (costPrice). Los precios
                        calculados no serán precisos.
                      </div>
                    )}

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {configFields.map(({ key, label, placeholder }) => (
                        <div key={key}>
                          <label className="text-xs text-coffee-600 dark:text-cream/60">
                            {label}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder={placeholder}
                            value={(form as Record<string, number | undefined>)[key] ?? ''}
                            onChange={(e) => setField(p.id, key, e.target.value)}
                            className="mt-1 w-full text-sm border border-coffee-200 dark:border-coffee-600 rounded-lg px-2 py-1.5 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream"
                          />
                        </div>
                      ))}
                    </div>

                    {p.costPrice && p.weight && (
                      <div className="bg-white dark:bg-coffee-900 rounded-lg p-3 space-y-2 border border-coffee-100 dark:border-coffee-700">
                        <p className="text-xs font-medium text-coffee-700 dark:text-cream/70 uppercase tracking-wide">
                          Preview calculado
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                          {calc &&
                            [
                              ['Costo materia/u', `$${calc.rawCostPerUnit.toFixed(2)}`],
                              ['Costo total/u', `$${calc.totalCostPerUnit.toFixed(2)}`],
                              ['Precio retail', `$${calc.suggestedRetailPrice.toFixed(2)}`],
                              ['Precio B2B', `$${calc.suggestedB2bPrice.toFixed(2)}`],
                              ['Margen retail', `$${calc.retailMarginAmount.toFixed(2)}`],
                              ['Margen B2B', `$${calc.b2bMarginAmount.toFixed(2)}`],
                            ].map(([label, val]) => (
                              <div key={label as string}>
                                <p className="text-xs text-coffee-400 dark:text-cream/40">
                                  {label}
                                </p>
                                <p className="font-medium text-coffee-900 dark:text-cream">{val}</p>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        onClick={() => handleSave(p)}
                        disabled={saving === p.id}
                        className="text-sm bg-coffee-800 text-cream px-4 py-2 rounded-lg hover:bg-coffee-900 disabled:opacity-50 transition-colors"
                      >
                        {saving === p.id ? 'Guardando...' : 'Guardar configuración'}
                      </button>
                      {calc && (
                        <button
                          onClick={async () => {
                            try {
                              await fetch(`/api/products/${p.id}`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${localStorage.getItem('admin_token')}`,
                                },
                                body: JSON.stringify({ price: calc.suggestedRetailPrice }),
                              });
                              addToast(
                                `Precio de ${p.name} actualizado a $${calc.suggestedRetailPrice.toFixed(2)}`,
                                'success',
                              );
                              fetchProducts();
                            } catch {
                              addToast('Error al aplicar precio', 'error');
                            }
                          }}
                          className="text-sm border border-coffee-300 dark:border-coffee-600 text-coffee-700 dark:text-cream px-4 py-2 rounded-lg hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors"
                        >
                          Aplicar precio sugerido (${calc.suggestedRetailPrice.toFixed(2)})
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
