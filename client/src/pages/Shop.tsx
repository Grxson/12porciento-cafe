import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X, ChevronDown } from 'lucide-react';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

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
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('TODOS');
  const [process, setProcess] = useState('Todos');
  const [roast, setRoast] = useState('Todos');
  const [sort, setSort] = useState('newest');

  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {};
    if (process !== 'Todos') params.process = process;
    if (roast !== 'Todos') params.roast = roast;
    if (category !== 'TODOS') params.category = category;
    productsApi.list(params).then((r) => {
      let data: Product[] = r.data;
      if (sort === 'sca')        data = [...data].sort((a, b) => (b.scaScore ?? 0) - (a.scaScore ?? 0));
      else if (sort === 'price-asc')  data = [...data].sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') data = [...data].sort((a, b) => b.price - a.price);
      setProducts(data);
      setLoading(false);
    });
  }, [process, roast, sort, category]);

  const isCafe = category === 'CAFÉ' || category === 'TODOS';
  const hasFilters = process !== 'Todos' || roast !== 'Todos';

  const resetFilters = () => { setProcess('Todos'); setRoast('Todos'); setCategory('TODOS'); };

  return (
    <div className="min-h-screen pt-24 pb-24 bg-coffee-50">
      {/* Page header */}
      <div className="page-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="gold-line mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-2">Tienda</h1>
            <p className="text-coffee-400 text-sm tracking-wide">
              {loading ? 'Cargando…' : `${products.length} producto${products.length !== 1 ? 's' : ''} · Origen México`}
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Category tabs */}
        <div className="flex gap-1 mb-8 border-b border-coffee-200 overflow-x-auto pb-px">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategory(cat.id); setProcess('Todos'); setRoast('Todos'); }}
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

        {/* Filter + sort bar */}
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

                {/* Process filters */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-coffee-400 uppercase tracking-widest mr-1">Proceso</span>
                  {processes.map((p) => (
                    <button
                      key={p}
                      onClick={() => setProcess(p)}
                      className={`text-[11px] px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        process === p
                          ? 'border-gold-500 text-gold-500 bg-gold-500/8 font-medium'
                          : 'border-coffee-300 text-coffee-600 hover:border-coffee-500 hover:text-coffee-900'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Roast filters */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="text-[10px] text-coffee-400 uppercase tracking-widest mr-1">Tueste</span>
                  {roasts.map((r) => (
                    <button
                      key={r}
                      onClick={() => setRoast(r)}
                      className={`text-[11px] px-3 py-1 border transition-all duration-150 cursor-pointer ${
                        roast === r
                          ? 'border-gold-500 text-gold-500 bg-gold-500/8 font-medium'
                          : 'border-coffee-300 text-coffee-600 hover:border-coffee-500 hover:text-coffee-900'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                {hasFilters && (
                  <button
                    onClick={resetFilters}
                    className="flex items-center gap-1 text-[11px] text-coffee-400 hover:text-red-500 transition-colors cursor-pointer ml-auto"
                  >
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
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="appearance-none bg-white border border-coffee-300 text-coffee-700 text-xs pl-3 pr-8 py-2 outline-none hover:border-coffee-500 transition-colors cursor-pointer"
            >
              <option value="newest">Más recientes</option>
              {isCafe && <option value="sca">Mayor puntaje SCA</option>}
              <option value="price-asc">Precio: menor a mayor</option>
              <option value="price-desc">Precio: mayor a menor</option>
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
      </div>
    </div>
  );
}
