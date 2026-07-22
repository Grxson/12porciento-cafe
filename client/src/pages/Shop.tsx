import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  SlidersHorizontal,
  X,
  ChevronDown,
  Search,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  SearchX,
  WifiOff,
} from 'lucide-react';
import api, { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';
import { PageMeta } from '../hooks/usePageMeta';

const PAGE_SIZE = 12;

const categories = [
  { id: 'TODOS', label: 'Todo' },
  { id: 'CAFÉ', label: 'Café' },
  { id: 'ACCESORIOS', label: 'Accesorios' },
  { id: 'MERCH', label: 'Merch' },
];
const processes = ['Todos', 'Lavado', 'Natural', 'Honey', 'Anaeróbico Natural'];
const roasts = ['Todos', 'Ligero', 'Medio-Ligero', 'Medio', 'Oscuro'];

function ShopSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden border border-coffee-200 dark:border-coffee-800">
          <div className="aspect-[4/3] sm:aspect-[3/4] shimmer" />
          <div className="p-5 space-y-3">
            <div className="shimmer h-3 w-1/3" />
            <div className="shimmer h-5 w-3/4" />
            <div className="flex gap-1.5">
              <div className="shimmer h-5 w-16" />
              <div className="shimmer h-5 w-14" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MobileFilterGroup({
  title,
  active,
  defaultOpen = false,
  children,
}: {
  title: string;
  active: boolean;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen || active);
  return (
    <section className="border-b border-coffee-200 pb-4 last:border-0 dark:border-coffee-800">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="flex items-center gap-2 text-sm font-semibold text-coffee-900 dark:text-cream">
          {title}
          {active && (
            <span className="h-2 w-2 rounded-full bg-gold-500" aria-label="Filtro activo" />
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-coffee-500 dark:text-coffee-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="mt-4 space-y-4">{children}</div>}
    </section>
  );
}

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const category = searchParams.get('categoria') || 'TODOS';
  const process = searchParams.get('proceso') || 'Todos';
  const roast = searchParams.get('tueste') || 'Todos';
  const search = searchParams.get('q') || '';
  const flavorsParam = searchParams.get('flavors');
  const selectedFlavors = useMemo(
    () =>
      flavorsParam
        ? flavorsParam
            .split(',')
            .map((f) => f.trim())
            .filter(Boolean)
        : [],
    [flavorsParam],
  );
  const [sort, setSort] = useState('newest');
  const [searchInput, setSearchInput] = useState(search);
  const [page, setPage] = useState(1);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const availableFlavors: string[] = [];
  const [flavorSearch, setFlavorSearch] = useState('');
  const [body, setBody] = useState('');
  const [acidity, setAcidity] = useState('');
  const [brewMethod, setBrewMethod] = useState('');
  const [certifications, setCertifications] = useState<string[]>([]);
  const [availableCertifications, setAvailableCertifications] = useState<
    Array<{ slug: string; name: string; issuer: string }>
  >(() => {
    const cached = sessionStorage.getItem('shop_certifications');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch {
        // cached value invalid
      }
    }
    return [];
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const filterSheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (availableCertifications.length > 0) return;
    api
      .get('/products/certifications')
      .then((response) => {
        const data = response.data.data ?? [];
        setAvailableCertifications(data);
        sessionStorage.setItem('shop_certifications', JSON.stringify(data));
      })
      .catch((err) => console.error('[shop] certifications', err));
  }, [availableCertifications]);

  const toggleCertification = (slug: string) => {
    setCertifications((current) =>
      current.includes(slug) ? current.filter((value) => value !== slug) : [...current, slug],
    );
    setPage(1);
  };

  // flavors already read from 'flavors' URL param via searchParams above

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      sort,
      page: String(page),
      pageSize: String(PAGE_SIZE),
    };
    if (process !== 'Todos') params.process = process;
    if (roast !== 'Todos') params.roast = roast;
    if (category !== 'TODOS') params.category = category;
    if (search) params.search = search;
    if (selectedFlavors.length > 0) params.flavors = selectedFlavors.join(',');
    if (body) params.body = body;
    if (acidity) params.acidity = acidity;
    if (brewMethod) params.brewMethod = brewMethod;
    if (certifications.length > 0) params.certifications = certifications.join(',');

    setError(false);
    productsApi
      .list(params)
      .then((r) => {
        setProducts(r.data.data);
        setTotal(r.data.total);
        setTotalPages(r.data.totalPages);
      })
      .catch((err) => {
        console.error(err);
        setError(true);
      })
      .finally(() => setLoading(false));
  }, [
    process,
    roast,
    sort,
    category,
    search,
    page,
    selectedFlavors,
    body,
    acidity,
    brewMethod,
    certifications,
    reloadKey,
  ]);

  const setParam = (key: string, value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!value || value === 'TODOS' || value === 'Todos') {
          next.delete(key);
        } else {
          next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );
  };

  const isCafe = category === 'CAFÉ' || category === 'TODOS';
  const hasFilters =
    process !== 'Todos' ||
    roast !== 'Todos' ||
    search ||
    selectedFlavors.length > 0 ||
    body !== '' ||
    acidity !== '' ||
    brewMethod !== '' ||
    certifications.length > 0;
  const activeFilterCount = [
    process !== 'Todos',
    roast !== 'Todos',
    category !== 'TODOS',
    selectedFlavors.length > 0,
    body !== '',
    acidity !== '',
    brewMethod !== '',
    certifications.length > 0,
  ].filter(Boolean).length;

  useEffect(() => {
    if (!filtersOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => filterSheetRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setFiltersOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !filterSheetRef.current) return;
      const focusable = Array.from(
        filterSheetRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      filterTriggerRef.current?.focus();
    };
  }, [filtersOpen]);

  const resetFilters = () => {
    setSearchInput('');
    setPage(1);
    setBody('');
    setAcidity('');
    setBrewMethod('');
    setCertifications([]);
    setSearchParams({}, { replace: true });
  };

  const toggleFlavor = (flavor: string) => {
    const current = selectedFlavors;
    const updated = current.includes(flavor)
      ? current.filter((f) => f !== flavor)
      : [...current, flavor];
    setParam('flavors', updated.join(','));
    setPage(1);
  };

  const displayedFlavors = flavorSearch
    ? availableFlavors.filter((f) => f.toLowerCase().includes(flavorSearch.toLowerCase()))
    : availableFlavors;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setParam('q', e.target.value);
      setPage(1);
    }, 350);
  };

  const handleCategoryChange = (id: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('categoria', id);
    next.delete('proceso');
    next.delete('tueste');
    setSearchParams(next, { replace: true });
    setPage(1);
    setBody('');
    setAcidity('');
    setBrewMethod('');
    setCertifications([]);
  };

  const handleSortChange = (s: string) => {
    setSort(s);
    setPage(1);
  };

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950">
      <PageMeta
        title="Tienda"
        description="Explora nuestra selección de cafés de especialidad: origen único, blends y suscripciones."
      />
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="gold-line mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-coffee-900 dark:text-cream mb-2">
              Tienda
            </h1>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm tracking-wide">
              {loading ? 'Cargando…' : `${total} producto${total !== 1 ? 's' : ''} · Origen México`}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Search */}
        <div className="relative mb-6 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400 pointer-events-none" />
          <input
            value={searchInput}
            onChange={handleSearchChange}
            placeholder="Buscar productos…"
            className="min-h-12 w-full bg-white dark:bg-coffee-900 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream pl-10 pr-12 py-3 text-base focus:border-gold-500 focus:outline-none placeholder:text-coffee-400"
          />
          {searchInput && (
            <button
              onClick={() => {
                setSearchInput('');
                setParam('q', '');
                setPage(1);
              }}
              className="absolute right-0 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-coffee-400 hover:text-coffee-700"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div
          className="flex gap-1 mb-8 border-b border-coffee-200 dark:border-coffee-800 overflow-x-auto pb-px"
          style={{ paddingLeft: 'var(--app-safe-left)', paddingRight: 'var(--app-safe-right)' }}
        >
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              aria-pressed={category === cat.id}
              className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                category === cat.id
                  ? 'border-gold-500 text-coffee-900 dark:text-cream bg-white dark:bg-coffee-800'
                  : 'border-transparent text-coffee-500 hover:text-coffee-800 dark:hover:text-cream hover:bg-coffee-100 dark:hover:bg-coffee-800/50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter bar — desktop only */}
        <AnimatePresence>
          {isCafe && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden hidden md:block"
            >
              <div className="flex flex-wrap gap-x-6 gap-y-3 items-center pb-6 mb-6 border-b border-coffee-200 dark:border-coffee-800">
                <div className="flex items-center gap-1.5 text-coffee-500 dark:text-coffee-400">
                  <span className="text-xs uppercase tracking-widest font-semibold">Filtros</span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                    Proceso
                  </span>
                  {processes.map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setParam('proceso', p);
                        setPage(1);
                      }}
                      aria-pressed={process === p}
                      className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        process === p
                          ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                          : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {category === 'CAFÉ' && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                      Cuerpo
                    </span>
                    {['', 'Ligero', 'Medio', 'Completo'].map((v) => (
                      <button
                        key={v || 'all-body'}
                        onClick={() => {
                          setBody(v);
                          setPage(1);
                        }}
                        aria-pressed={body === v}
                        className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                          body === v
                            ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                            : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                        }`}
                      >
                        {v || 'Todo'}
                      </button>
                    ))}
                  </div>
                )}
                {category === 'CAFÉ' && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                      Acidez
                    </span>
                    {['', 'Baja', 'Media', 'Alta'].map((v) => (
                      <button
                        key={v || 'all-acidity'}
                        onClick={() => {
                          setAcidity(v);
                          setPage(1);
                        }}
                        aria-pressed={acidity === v}
                        className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                          acidity === v
                            ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                            : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                        }`}
                      >
                        {v || 'Todo'}
                      </button>
                    ))}
                  </div>
                )}
                {category === 'CAFÉ' && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                      Método
                    </span>
                    {['', 'V60', 'AeroPress', 'Espresso', 'Chemex', 'French Press'].map((v) => (
                      <button
                        key={v || 'all-method'}
                        onClick={() => {
                          setBrewMethod(v);
                          setPage(1);
                        }}
                        aria-pressed={brewMethod === v}
                        className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                          brewMethod === v
                            ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                            : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                        }`}
                      >
                        {v || 'Todo'}
                      </button>
                    ))}
                  </div>
                )}
                {category === 'CAFÉ' && availableCertifications.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                      Certificación
                    </span>
                    {availableCertifications.map((certification) => (
                      <button
                        key={certification.slug}
                        onClick={() => toggleCertification(certification.slug)}
                        aria-pressed={certifications.includes(certification.slug)}
                        title={`Emitida por ${certification.issuer}`}
                        className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                          certifications.includes(certification.slug)
                            ? 'border-green-600 text-green-700 bg-green-500/10 font-medium dark:text-green-400'
                            : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-green-600'
                        }`}
                      >
                        {certification.name}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mr-1">
                    Tueste
                  </span>
                  {roasts.map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setParam('tueste', r);
                        setPage(1);
                      }}
                      aria-pressed={roast === r}
                      className={`text-xs px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        roast === r
                          ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                          : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {availableFlavors.length > 0 && (
                  <div className="w-full border-t border-coffee-200 dark:border-coffee-800 pt-3 mt-1">
                    <span className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest block mb-2">
                      Notas de Cata
                    </span>
                    <div className="relative mb-2 max-w-xs">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-coffee-400 pointer-events-none" />
                      <input
                        value={flavorSearch}
                        onChange={(e) => setFlavorSearch(e.target.value)}
                        placeholder="Buscar nota de cata…"
                        className="w-full bg-white dark:bg-coffee-900 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream pl-8 pr-3 py-1.5 text-xs focus:border-gold-500 focus:outline-none placeholder:text-coffee-400"
                      />
                      {flavorSearch && (
                        <button
                          onClick={() => setFlavorSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {flavorSearch && displayedFlavors.length === 0 ? (
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 italic">Sin coincidencias</p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {displayedFlavors.map((f) => (
                          <button
                            key={f}
                            onClick={() => toggleFlavor(f)}
                            aria-pressed={selectedFlavors.includes(f)}
                            className={`text-xs px-2 py-0.5 border transition-all duration-150 cursor-pointer ${
                              selectedFlavors.includes(f)
                                ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                            }`}
                          >
                            {f}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-xs text-coffee-400 hover:text-red-500 transition-colors cursor-pointer ml-auto"
                  >
                    <X className="w-3 h-3" /> Limpiar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort select — desktop only */}
        <div className="hidden md:flex justify-end mb-8">
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-white dark:bg-coffee-900 border border-coffee-300 dark:border-coffee-700 text-coffee-700 dark:text-coffee-300 text-xs pl-3 pr-8 py-2 outline-none hover:border-coffee-500 dark:hover:border-coffee-500 transition-colors cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              {isCafe && <option value="sca">Mayor puntaje SCA</option>}
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-coffee-400 pointer-events-none" />
          </div>
        </div>

        {/* Mobile toolbar — Filtros button + sort select */}
        <div className="flex items-center gap-3 mb-6 md:hidden">
          <button
            ref={filterTriggerRef}
            onClick={() => setFiltersOpen(true)}
            className="relative flex min-h-12 items-center gap-2 border border-coffee-300 px-4 text-sm text-coffee-700 transition-colors hover:border-coffee-500 dark:border-coffee-700 dark:text-coffee-300"
            aria-haspopup="dialog"
            aria-expanded={filtersOpen}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filtros
            {(process !== 'Todos' ||
              roast !== 'Todos' ||
              category !== 'TODOS' ||
              selectedFlavors.length > 0 ||
              body !== '' ||
              acidity !== '' ||
              brewMethod !== '' ||
              certifications.length > 0) && (
              <span className="absolute -top-1.5 -right-1.5 bg-gold-500 text-coffee-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                {activeFilterCount}
              </span>
            )}
          </button>
          <div className="relative flex-1">
            <select
              value={sort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="min-h-12 w-full appearance-none border border-coffee-300 bg-white pl-3 pr-8 text-base text-coffee-700 outline-none transition-colors hover:border-coffee-500 dark:border-coffee-700 dark:bg-coffee-900 dark:text-coffee-300"
            >
              <option value="newest">Más recientes</option>
              {isCafe && <option value="sca">Mayor puntaje SCA</option>}
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-coffee-400 pointer-events-none" />
          </div>
        </div>

        {/* Mobile bottom sheet */}
        <AnimatePresence>
          {filtersOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-coffee-950/70 md:hidden"
                onClick={() => setFiltersOpen(false)}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 32, stiffness: 320 }}
                ref={filterSheetRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby="mobile-filter-title"
                tabIndex={-1}
                className="fixed bottom-0 left-0 right-0 z-50 flex max-h-[min(92dvh,48rem)] flex-col overflow-hidden border-t border-coffee-200 bg-white outline-none dark:border-coffee-800 dark:bg-coffee-900 md:hidden"
                style={{
                  paddingLeft: 'var(--app-safe-left)',
                  paddingRight: 'var(--app-safe-right)',
                }}
              >
                {/* Sheet header */}
                <div className="flex shrink-0 items-center justify-between border-b border-coffee-200 px-5 py-3 dark:border-coffee-800">
                  <div>
                    <h3
                      id="mobile-filter-title"
                      className="font-serif text-xl text-coffee-900 dark:text-cream"
                    >
                      Filtros
                    </h3>
                    <p className="text-xs text-coffee-500 dark:text-coffee-400">{activeFilterCount} activos</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {hasFilters && (
                      <button
                        onClick={resetFilters}
                        className="min-h-11 px-3 text-xs font-medium text-coffee-500 dark:text-coffee-400 hover:text-red-500"
                      >
                        Limpiar
                      </button>
                    )}
                    <button
                      onClick={() => setFiltersOpen(false)}
                      aria-label="Cerrar"
                      className="flex min-h-11 min-w-11 items-center justify-center text-coffee-500 hover:text-coffee-900 dark:text-coffee-400 dark:hover:text-cream"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 [&_button]:min-h-11 [&_input]:min-h-12 [&_input]:text-base">
                  <MobileFilterGroup title="Catálogo" active={category !== 'TODOS'} defaultOpen>
                    {/* Category */}
                    <div className="space-y-2">
                      <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                        Categoría
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {categories.map((cat) => (
                          <button
                            key={cat.id}
                            onClick={() => handleCategoryChange(cat.id)}
                            aria-pressed={category === cat.id}
                            className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                              category === cat.id
                                ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                            }`}
                          >
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </MobileFilterGroup>

                  <MobileFilterGroup
                    title="Perfil del café"
                    active={
                      process !== 'Todos' ||
                      roast !== 'Todos' ||
                      body !== '' ||
                      acidity !== '' ||
                      brewMethod !== '' ||
                      certifications.length > 0
                    }
                    defaultOpen={isCafe}
                  >
                    {/* Process — only relevant for café */}
                    {isCafe && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Proceso
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {processes.map((p) => (
                            <button
                              key={p}
                              onClick={() => {
                                setParam('proceso', p);
                                setPage(1);
                              }}
                              aria-pressed={process === p}
                              className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                process === p
                                  ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                              }`}
                            >
                              {p}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Body — only relevant for café */}
                    {category === 'CAFÉ' && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Cuerpo
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {['', 'Ligero', 'Medio', 'Completo'].map((v) => (
                            <button
                              key={v || 'all-body'}
                              onClick={() => {
                                setBody(v);
                                setPage(1);
                              }}
                              aria-pressed={body === v}
                              className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                body === v
                                  ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                              }`}
                            >
                              {v || 'Todo'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Acidity — only relevant for café */}
                    {category === 'CAFÉ' && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Acidez
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {['', 'Baja', 'Media', 'Alta'].map((v) => (
                            <button
                              key={v || 'all-acidity'}
                              onClick={() => {
                                setAcidity(v);
                                setPage(1);
                              }}
                              aria-pressed={acidity === v}
                              className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                acidity === v
                                  ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                              }`}
                            >
                              {v || 'Todo'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Brew method — only relevant for café */}
                    {category === 'CAFÉ' && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Método
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {['', 'V60', 'AeroPress', 'Espresso', 'Chemex', 'French Press'].map(
                            (v) => (
                              <button
                                key={v || 'all-method'}
                                onClick={() => {
                                  setBrewMethod(v);
                                  setPage(1);
                                }}
                                aria-pressed={brewMethod === v}
                                className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                  brewMethod === v
                                    ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                    : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                                }`}
                              >
                                {v || 'Todo'}
                              </button>
                            ),
                          )}
                        </div>
                      </div>
                    )}

                    {category === 'CAFÉ' && availableCertifications.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Certificación
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableCertifications.map((certification) => (
                            <button
                              key={certification.slug}
                              onClick={() => toggleCertification(certification.slug)}
                              aria-pressed={certifications.includes(certification.slug)}
                              title={`Emitida por ${certification.issuer}`}
                              className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                certifications.includes(certification.slug)
                                  ? 'border-green-600 text-green-700 bg-green-500/10 font-medium dark:text-green-400'
                                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-green-600'
                              }`}
                            >
                              {certification.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Roast — only relevant for café */}
                    {isCafe && (
                      <div className="space-y-2">
                        <span className="text-xs text-coffee-400 uppercase tracking-widest block">
                          Tueste
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {roasts.map((r) => (
                            <button
                              key={r}
                              onClick={() => {
                                setParam('tueste', r);
                                setPage(1);
                              }}
                              aria-pressed={roast === r}
                              className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                roast === r
                                  ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                  : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                              }`}
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </MobileFilterGroup>

                  {availableFlavors.length > 0 && (
                    <MobileFilterGroup title="Notas de cata" active={selectedFlavors.length > 0}>
                      <div className="space-y-2">
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400 pointer-events-none" />
                          <input
                            value={flavorSearch}
                            onChange={(e) => setFlavorSearch(e.target.value)}
                            placeholder="Buscar nota de cata…"
                            className="w-full bg-white dark:bg-coffee-900 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream pl-9 pr-3 py-2 text-sm focus:border-gold-500 focus:outline-none placeholder:text-coffee-400"
                          />
                          {flavorSearch && (
                            <button
                              onClick={() => setFlavorSearch('')}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {flavorSearch && displayedFlavors.length === 0 ? (
                      <p className="text-xs text-coffee-500 dark:text-coffee-400 italic">Sin coincidencias</p>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {displayedFlavors.map((f) => (
                              <button
                                key={f}
                                onClick={() => toggleFlavor(f)}
                                aria-pressed={selectedFlavors.includes(f)}
                                className={`text-xs px-3 py-1.5 border transition-all duration-150 cursor-pointer ${
                                  selectedFlavors.includes(f)
                                    ? 'border-gold-500 text-gold-500 bg-gold-500/10 font-medium'
                                    : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 hover:text-coffee-900 dark:hover:text-cream'
                                }`}
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </MobileFilterGroup>
                  )}
                </div>

                <div
                  className="shrink-0 border-t border-coffee-200 bg-white px-5 pt-3 dark:border-coffee-800 dark:bg-coffee-900"
                  style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 0.75rem)' }}
                >
                  <button
                    onClick={() => setFiltersOpen(false)}
                    className="min-h-12 w-full bg-gold-500 px-4 font-semibold text-coffee-950"
                  >
                    Ver {total} resultado{total !== 1 ? 's' : ''}
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Grid */}
        {loading ? (
          <ShopSkeleton />
        ) : error ? (
          <div className="text-center py-24">
            <WifiOff className="w-16 h-16 text-coffee-300 dark:text-coffee-600 mx-auto mb-4" />
            <p className="font-serif text-2xl text-coffee-400 mb-2">
              {!navigator.onLine ? 'Sin conexión' : 'Error al cargar'}
            </p>
            <p className="text-coffee-500 dark:text-coffee-400 text-sm mb-8">
              {!navigator.onLine
                ? 'Revisa tu conexión a internet e intenta de nuevo.'
                : 'No se pudieron cargar los productos.'}
            </p>
            <button onClick={() => setReloadKey((k) => k + 1)} className="btn-outline">
              Reintentar
            </button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <SearchX className="w-16 h-16 text-coffee-300 dark:text-coffee-600 mx-auto mb-4" />
            <p className="font-serif text-2xl text-coffee-400 mb-2">Sin resultados</p>
            <p className="text-coffee-500 dark:text-coffee-400 text-sm mb-2">No hay productos con esos filtros.</p>
            <p className="text-coffee-400 dark:text-coffee-500 text-xs mb-8">
              Intenta cambiar categoría, proceso o buscar otro término.
            </p>
            <button onClick={resetFilters} className="btn-outline">
              Ver todos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex min-h-11 min-w-11 items-center justify-center border border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`e${i}`} className="px-2 text-coffee-500 dark:text-coffee-400 text-sm">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`min-h-11 min-w-11 text-sm border transition-colors ${
                      page === p
                        ? 'border-gold-500 bg-gold-500/10 text-gold-600 font-semibold'
                        : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500'
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="flex min-h-11 min-w-11 items-center justify-center border border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Página siguiente"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
