import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import type { Product } from '../types';

const categories = [
  { id: 'TODOS', label: 'Todos' },
  { id: 'CAFÉ', label: 'Café' },
  { id: 'ACCESORIOS', label: 'Accesorios' },
  { id: 'MERCH', label: 'Merch' },
];
const processes = ['Todos', 'Lavado', 'Natural', 'Honey', 'Anaeróbico Natural'];
const roasts = ['Todos', 'Ligero', 'Medio-Ligero', 'Medio', 'Oscuro'];

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
      if (sort === 'sca') data = [...data].sort((a, b) => (b.scaScore ?? 0) - (a.scaScore ?? 0));
      else if (sort === 'price-asc') data = [...data].sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') data = [...data].sort((a, b) => b.price - a.price);
      setProducts(data);
      setLoading(false);
    });
  }, [process, roast, sort, category]);

  const isCafe = category === 'CAFÉ' || category === 'TODOS';

  const resetFilters = () => {
    setProcess('Todos');
    setRoast('Todos');
    setCategory('TODOS');
  };

  return (
    <div className="pt-24 pb-24 min-h-screen">
      {/* Header */}
      <div className="bg-coffee-900 border-b border-coffee-800 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-12 h-[2px] bg-gold-500 mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-3">Tienda</h1>
            <p className="text-coffee-300 text-lg">
              {products.length} productos · Origen México
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10">
        {/* Category tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-6">
          <div className="flex gap-2 border-b border-coffee-200 pb-4">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setCategory(cat.id); setProcess('Todos'); setRoast('Todos'); }}
                className={`px-5 py-2 text-sm font-medium uppercase tracking-wide transition-all ${
                  category === cat.id
                    ? 'bg-gold-500 text-coffee-950'
                    : 'text-coffee-700 hover:text-coffee-900 border border-coffee-300 hover:border-coffee-600'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Filters - only show for café */}
        {isCafe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-wrap gap-4 items-center mb-10 pb-6 border-b border-coffee-200"
          >
            <div className="flex items-center gap-2 text-coffee-500">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-xs uppercase tracking-widest">Filtros</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-coffee-500 uppercase tracking-widest self-center mr-1">Proceso:</span>
              {processes.map((p) => (
                <button
                  key={p}
                  onClick={() => setProcess(p)}
                  className={`text-xs px-3 py-1.5 border transition-all ${
                    process === p ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-300 text-coffee-600 hover:border-coffee-600'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-coffee-500 uppercase tracking-widest self-center mr-1">Tueste:</span>
              {roasts.map((r) => (
                <button
                  key={r}
                  onClick={() => setRoast(r)}
                  className={`text-xs px-3 py-1.5 border transition-all ${
                    roast === r ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-300 text-coffee-600 hover:border-coffee-600'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>

            {(process !== 'Todos' || roast !== 'Todos') && (
              <button onClick={resetFilters} className="flex items-center gap-1 text-xs text-coffee-500 hover:text-coffee-900 transition-colors">
                <X className="w-3 h-3" /> Limpiar
              </button>
            )}
          </motion.div>
        )}

        {/* Sort */}
        <div className="flex justify-end mb-8">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-white border border-coffee-300 text-coffee-700 text-xs px-3 py-1.5 outline-none"
          >
            <option value="newest">Más recientes</option>
            {isCafe && <option value="sca">Mayor puntaje SCA</option>}
            <option value="price-asc">Precio: menor a mayor</option>
            <option value="price-desc">Precio: mayor a menor</option>
          </select>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-coffee-100 animate-pulse aspect-[4/5]" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-coffee-400 text-lg">No hay productos con esos filtros.</p>
            <button onClick={resetFilters} className="btn-outline mt-6">Ver todos</button>
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
