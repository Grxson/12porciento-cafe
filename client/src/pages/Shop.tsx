import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown, Search, ChevronLeft, ChevronRight as ChevronRightIcon } from 'lucide-react';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

const PAGE_SIZE = 12;

const categories = [
  { id: 'TODOS', label: 'Todo' },
  { id: 'CAFÉ',  label: 'Café' },
  { id: 'ACCESORIOS', label: 'Accesorios' },
  { id: 'MERCH', label: 'Merch' },
];
const processes = ['Todos', 'Lavado', 'Natural', 'Honey', 'Anaeróbico Natural'];
const roasts    = ['Todos', 'Ligero', 'Medio-Ligero', 'Medio', 'Oscuro'];

function ShopSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="overflow-hidden border border-coffee-200">
          <div className="aspect-[3/4] shimmer" />
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

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('TODOS');
  const [process, setProcess] = useState('Todos');
  const [roast, setRoast] = useState('Todos');
  const [sort, setSort] = useState('newest');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    productsApi.list(params).then((r) => {
      setProducts(r.data.data);
      setTotal(r.data.total);
      setTotalPages(r.data.totalPages);
      setLoading(false);
    });
  }, [process, roast, sort, category, search, page]);

  const isCafe = category === 'CAFÉ' || category === 'TODOS';
  const hasFilters = process !== 'Todos' || roast !== 'Todos' || search;

  const resetFilters = () => {
    setProcess('Todos'); setRoast('Todos'); setCategory('TODOS');
    setSearch(''); setSearchInput(''); setPage(1);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(e.target.value);
      setPage(1);
    }, 350);
  };

  const handleCategoryChange = (id: string) => {
    setCategory(id); setProcess('Todos'); setRoast('Todos'); setPage(1);
  };

  const handleSortChange = (s: string) => { setSort(s); setPage(1); };

  return (
    <div className="min-h-screen pt-24 pb-24 bg-coffee-50">
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="gold-line mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-2">Tienda</h1>
            <p className="text-coffee-400 text-sm tracking-wide">
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
            className="w-full bg-white border border-coffee-300 text-coffee-900 pl-9 pr-4 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
          />
          {searchInput && (
            <button
              onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-coffee-400 hover:text-coffee-700"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Category tabs */}
        <div className="flex gap-1 mb-8 border-b border-coffee-200 overflow-x-auto pb-px">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.15em] whitespace-nowrap transition-all duration-200 border-b-2 -mb-px ${
                category === cat.id
                  ? 'border-gold-500 text-coffee-900 bg-white'
                  : 'border-transparent text-coffee-500 hover:text-coffee-800 hover:bg-coffee-100'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <AnimatePresence>
          {isCafe && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-x-6 gap-y-3 items-center pb-6 mb-6 border-b border-coffee-200">
                <div className="flex items-center gap-1.5 text-coffee-500">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-semibold">Filtros</span>
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-coffee-400 uppercase tracking-widest mr-1">Proceso</span>
                  {processes.map((p) => (
                    <button key={p} onClick={() => { setProcess(p); setPage(1); }}
                      className={`text-[11px] px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        process === p ? 'border-gold-500 text-gold-500 bg-gold-500/8 font-medium' : 'border-coffee-300 text-coffee-600 hover:border-coffee-500 hover:text-coffee-900'
                      }`}>{p}</button>
                  ))}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-coffee-400 uppercase tracking-widest mr-1">Tueste</span>
                  {roasts.map((r) => (
                    <button key={r} onClick={() => { setRoast(r); setPage(1); }}
                      className={`text-[11px] px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        roast === r ? 'border-gold-500 text-gold-500 bg-gold-500/8 font-medium' : 'border-coffee-300 text-coffee-600 hover:border-coffee-500 hover:text-coffee-900'
                      }`}>{r}</button>
                  ))}
                </div>

                {hasFilters && (
                  <button onClick={resetFilters}
                    className="flex items-center gap-1 text-[11px] text-coffee-400 hover:text-red-500 transition-colors cursor-pointer ml-auto">
                    <X className="w-3 h-3" /> Limpiar filtros
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sort select */}
        <div className="flex justify-end mb-8">
          <div className="relative">
            <select value={sort} onChange={(e) => handleSortChange(e.target.value)}
              className="appearance-none bg-white border border-coffee-300 text-coffee-700 text-xs pl-3 pr-8 py-2 outline-none hover:border-coffee-500 transition-colors cursor-pointer">
              <option value="newest">Más recientes</option>
              {isCafe && <option value="sca">Mayor puntaje SCA</option>}
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-coffee-400 pointer-events-none" />
          </div>
        </div>

        {/* Grid */}
        {loading ? (
          <ShopSkeleton />
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="font-serif text-2xl text-coffee-400 mb-3">Sin resultados</p>
            <p className="text-coffee-500 text-sm mb-8">No hay productos con esos filtros.</p>
            <button onClick={resetFilters} className="btn-outline">Ver todos</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              className="p-2 border border-coffee-300 text-coffee-600 hover:border-coffee-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
                  <span key={`e${i}`} className="px-2 text-coffee-400 text-sm">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-9 h-9 text-sm border transition-colors ${
                      page === p
                        ? 'border-gold-500 bg-gold-500/10 text-gold-600 font-semibold'
                        : 'border-coffee-300 text-coffee-600 hover:border-coffee-500'
                    }`}
                  >
                    {p}
                  </button>
                )
              )
            }

            <button
              onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
              disabled={page === totalPages}
              className="p-2 border border-coffee-300 text-coffee-600 hover:border-coffee-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
