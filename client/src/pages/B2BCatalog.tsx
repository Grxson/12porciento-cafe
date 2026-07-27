import { useEffect, useMemo, useState } from 'react';
import { Building2, Coffee, Search, SlidersHorizontal, Truck } from 'lucide-react';
import { b2bApi } from '../api';
import type { B2BFrequency, B2BProduct } from '../types';
import B2BInquiryForm from '../components/b2b/B2BInquiryForm';
import B2BProductCard from '../components/b2b/B2BProductCard';
import B2BQuoteSummary from '../components/b2b/B2BQuoteSummary';
import { useB2BQuoteDraft } from '../hooks/useB2BQuoteDraft';

const businessTypes = [
  { value: 'CAFETERIA', label: 'Cafetería' },
  { value: 'RESTAURANTE', label: 'Restaurante' },
  { value: 'OFICINAS', label: 'Oficinas' },
  { value: 'HOTELERIA', label: 'Hotelería' },
  { value: 'REVENTA', label: 'Reventa' },
  { value: 'OTRO', label: 'Otro' },
];

const frequencies: Array<{ value: B2BFrequency; label: string }> = [
  { value: 'one-time', label: 'Compra única' },
  { value: 'weekly', label: 'Cada semana' },
  { value: 'biweekly', label: 'Cada 2 semanas' },
  { value: 'monthly', label: 'Cada mes' },
];

export default function B2BCatalog() {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [region, setRegion] = useState('TODAS');
  const [formOpen, setFormOpen] = useState(false);
  const { draft, upsertItem, removeItem, setBusinessType, setFrequency, reset } =
    useB2BQuoteDraft();

  useEffect(() => {
    b2bApi
      .catalog()
      .then((response) => setProducts(response.data.data))
      .catch(() => setLoadError('No pudimos cargar el catálogo empresarial. Intenta de nuevo.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (draft.businessType) return;
    try {
      const value = window.localStorage.getItem('12pct:b2b-contact:v1');
      if (!value) return;
      const parsed = JSON.parse(value) as { businessType?: string };
      if (parsed.businessType) setBusinessType(parsed.businessType);
    } catch {
      window.localStorage.removeItem('12pct:b2b-contact:v1');
    }
  }, [draft.businessType, setBusinessType]);

  const regions = useMemo(
    () => [
      'TODAS',
      ...new Set(
        products
          .map((product) => product.region || product.origin)
          .filter((value): value is string => Boolean(value)),
      ),
    ],
    [products],
  );

  const visibleProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      const matchesRegion =
        region === 'TODAS' || product.region === region || product.origin === region;
      const matchesSearch =
        !query ||
        [product.name, product.origin, product.region, product.description]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query));
      return matchesRegion && matchesSearch;
    });
  }, [products, region, search]);

  const openForm = () => {
    if (!draft.businessType) {
      document
        .getElementById('tipo-negocio')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFormOpen(true);
  };

  return (
    <div className="min-h-screen overflow-x-clip bg-[#F4EFE5] pb-28 text-[#27170F] dark:bg-coffee-950 dark:text-cream md:pb-0">
      <section className="relative overflow-hidden bg-[#27170F] text-[#F4EFE5]">
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_20%_0%,#d0a45d_0,transparent_26%),radial-gradient(circle_at_90%_90%,#7d4d1f_0,transparent_34%)]" />
        <div className="absolute inset-y-0 right-[12%] hidden w-px bg-white/10 lg:block" />
        <div className="relative mx-auto grid max-w-[1500px] gap-10 px-5 py-14 sm:px-8 md:py-20 lg:grid-cols-[1.25fr_.75fr] lg:px-12">
          <div>
            <p className="flex items-center gap-3 text-[10px] uppercase tracking-[0.34em] text-[#D0A45D]">
              <span className="h-px w-10 bg-[#D0A45D]" />
              Café para empresas
            </p>
            <h1 className="mt-7 max-w-4xl font-serif text-5xl leading-[0.96] sm:text-6xl lg:text-7xl">
              Construye una selección que funcione para tu operación.
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-7 text-[#d6c8bb] sm:text-lg">
              Explora orígenes mexicanos, compara precios por volumen y recibe una propuesta
              comercial revisada por nuestro equipo.
            </p>
          </div>

          <div className="self-end border-l border-[#D0A45D]/40 pl-6 lg:pl-8">
            <p className="font-serif text-2xl">Del catálogo a tu mesa, sin adivinanzas.</p>
            <div className="mt-6 grid gap-4 text-sm text-[#d6c8bb] sm:grid-cols-3 lg:grid-cols-1">
              {[
                [Coffee, 'Precios visibles', 'Escalones claros por cantidad.'],
                [Building2, 'Revisión humana', 'Condiciones adaptadas a tu negocio.'],
                [Truck, 'Logística acordada', 'Frecuencia y entrega antes de confirmar.'],
              ].map(([Icon, title, text]) => {
                const FeatureIcon = Icon as typeof Coffee;
                return (
                  <div key={String(title)} className="flex gap-3">
                    <FeatureIcon className="mt-0.5 h-4 w-4 shrink-0 text-[#D0A45D]" />
                    <div>
                      <p className="font-medium text-[#F4EFE5]">{String(title)}</p>
                      <p className="mt-0.5 text-xs leading-5">{String(text)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-[1500px] px-5 py-10 sm:px-8 lg:px-12 lg:py-14">
        <section
          id="tipo-negocio"
          className="grid gap-6 border-b border-[#d6c6b2] pb-9 dark:border-coffee-700 lg:grid-cols-[1fr_auto]"
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.26em] text-[#7D4D1F] dark:text-gold-400">
              01 · Contexto
            </p>
            <h2 className="mt-2 font-serif text-3xl">¿Dónde se servirá el café?</h2>
            <div className="mt-5 flex flex-wrap gap-2">
              {businessTypes.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setBusinessType(type.value)}
                  className={`action-focus border px-4 py-2.5 text-xs uppercase tracking-[0.14em] transition-colors ${
                    draft.businessType === type.value
                      ? 'border-[#27170F] bg-[#27170F] text-[#F4EFE5] dark:border-gold-500 dark:bg-gold-500 dark:text-coffee-950'
                      : 'border-[#cdbca6] bg-[#fffdf8] text-[#725F50] hover:border-[#7D4D1F] dark:border-coffee-700 dark:bg-coffee-900 dark:text-coffee-300'
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>
          <label className="self-end">
            <span className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[#7D4D1F] dark:text-gold-400">
              Frecuencia estimada
            </span>
            <select
              value={draft.frequency}
              onChange={(event) => setFrequency(event.target.value as B2BFrequency)}
              className="action-focus min-w-56 border border-[#cdbca6] bg-[#fffdf8] px-4 py-3 text-sm dark:border-coffee-700 dark:bg-coffee-900"
            >
              {frequencies.map((frequency) => (
                <option key={frequency.value} value={frequency.value}>
                  {frequency.label}
                </option>
              ))}
            </select>
          </label>
        </section>

        <section className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[#7D4D1F] dark:text-gold-400">
                  02 · Selección
                </p>
                <h2 className="mt-2 font-serif text-3xl">Cafés disponibles</h2>
                <p className="mt-1 text-sm text-[#725F50] dark:text-coffee-300">
                  {visibleProducts.length} opciones para comparar
                </p>
              </div>
              <div className="flex min-w-0 gap-2">
                <label className="relative min-w-0 flex-1 sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D4D1F]" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar origen o café"
                    className="action-focus w-full border border-[#cdbca6] bg-[#fffdf8] py-3 pl-10 pr-3 text-sm dark:border-coffee-700 dark:bg-coffee-900"
                  />
                </label>
                <label className="relative">
                  <SlidersHorizontal className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7D4D1F]" />
                  <select
                    aria-label="Filtrar por región"
                    value={region}
                    onChange={(event) => setRegion(event.target.value)}
                    className="action-focus h-full max-w-40 border border-[#cdbca6] bg-[#fffdf8] pl-10 pr-3 text-sm dark:border-coffee-700 dark:bg-coffee-900"
                  >
                    {regions.map((value) => (
                      <option key={value} value={value}>
                        {value === 'TODAS' ? 'Todas' : value}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div
                    key={item}
                    className="aspect-[4/5] animate-pulse border border-[#dfd1bf] bg-[#e8ddce] dark:border-coffee-700 dark:bg-coffee-900"
                  />
                ))}
              </div>
            ) : loadError ? (
              <div className="mt-7 border border-red-800/30 bg-red-50 p-6 text-sm text-red-800 dark:bg-red-950/20 dark:text-red-200">
                {loadError}
              </div>
            ) : visibleProducts.length ? (
              <div className="mt-7 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {visibleProducts.map((product) => (
                  <B2BProductCard
                    key={product.id}
                    product={product}
                    item={draft.items.find((item) => item.productId === product.id)}
                    frequency={draft.frequency}
                    onChange={upsertItem}
                    onRemove={() => removeItem(product.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-7 border border-dashed border-[#cdbca6] py-16 text-center">
                <Coffee className="mx-auto h-8 w-8 text-[#7D4D1F]" />
                <p className="mt-3 text-sm text-[#725F50]">No hay cafés para ese filtro.</p>
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <div className="sticky top-[calc(var(--app-header-height)+var(--app-safe-top)+1.5rem)]">
              <B2BQuoteSummary
                items={draft.items}
                products={products}
                onRemove={removeItem}
                onContinue={openForm}
              />
              {!draft.businessType && draft.items.length > 0 && (
                <p className="mt-3 text-center text-xs text-[#7D4D1F] dark:text-gold-400">
                  Elige tu tipo de negocio para continuar.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      {draft.items.length > 0 && (
        <div
          className="fixed inset-x-0 z-50 border-t border-[#D0A45D]/50 bg-[#27170F] lg:hidden"
          style={{ bottom: 'calc(var(--app-bottom-nav-height) + var(--app-safe-bottom))' }}
        >
          <B2BQuoteSummary
            compact
            items={draft.items}
            products={products}
            onRemove={removeItem}
            onContinue={openForm}
          />
        </div>
      )}

      <B2BInquiryForm
        open={formOpen}
        draft={draft}
        products={products}
        onClose={() => setFormOpen(false)}
        onCompleted={reset}
      />
    </div>
  );
}
