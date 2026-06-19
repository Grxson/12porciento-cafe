import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { productsApi } from '../api';
import type { Product } from '../types';

interface Props {
  value: string;
  onChange: (id: string) => void;
  initialLabel: string;
}

export default function SearchableProductSelect({ value, onChange, initialLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    productsApi.list()
      .then((r) => { setProducts(r.data.data.filter((p: Product) => p.isActive)); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = products.find((p) => p.id === value);
  const label = selected?.name ?? initialLabel ?? 'Seleccionar café';

  const filtered = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.origin?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 flex items-center justify-between hover:border-coffee-600 transition-colors"
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-coffee-800 border border-coffee-700 z-50 max-h-64 flex flex-col"
          >
            <div className="border-b border-coffee-700 p-2">
              <input
                type="text"
                placeholder="Buscar café..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-coffee-900 border border-coffee-700 text-cream text-sm px-2 py-1.5 focus:outline-none focus:border-gold-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-3 text-center text-coffee-400 text-xs">Cargando...</div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-center text-coffee-400 text-xs">Sin resultados</div>
              ) : (
                filtered.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      onChange(product.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      product.id === value
                        ? 'bg-gold-600/20 text-gold-500'
                        : 'text-cream hover:bg-coffee-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        {product.origin && (
                          <p className="text-[11px] text-coffee-400 truncate">{product.origin}</p>
                        )}
                      </div>
                      {product.id === value && <span className="ml-2 text-gold-500">✓</span>}
                    </div>
                  </button>
                ))
              )}
            </div>

            {value && (
              <div className="border-t border-coffee-700 p-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setSearch('');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-coffee-400 hover:text-cream transition-colors"
                >
                  <X className="w-3 h-3" />
                  Limpiar selección
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
