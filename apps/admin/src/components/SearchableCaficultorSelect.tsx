import { useEffect, useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, X } from 'lucide-react';
import { caficultoresApi } from '../api';
import type { Caficultor } from '../types';

interface Props {
  value: string;
  onChange: (id: string) => void;
  initialLabel?: string;
  placeholder?: string;
}

export default function SearchableCaficultorSelect({
  value,
  onChange,
  initialLabel,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Caficultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    caficultoresApi
      .list({ pageSize: 100, isActive: 'true' })
      .then((r) => setItems(r.data.data))
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

  const selected = items.find((c) => c.id === value);
  const label = selected
    ? `${selected.nombre} — ${selected.region}`
    : (initialLabel ?? placeholder ?? 'Seleccionar caficultor');

  const filtered = useMemo(() => items.filter(
    (c) =>
      c.nombre.toLowerCase().includes(search.toLowerCase()) ||
      c.region.toLowerCase().includes(search.toLowerCase()),
  ), [items, search]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 flex items-center justify-between hover:border-coffee-400 dark:hover:border-coffee-600 transition-colors"
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown
          className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 z-50 max-h-64 flex flex-col"
          >
            <div className="border-b border-coffee-200 dark:border-coffee-700 p-2">
              <input
                type="text"
                placeholder="Buscar caficultor..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm px-2 py-1.5 focus:outline-none focus:border-gold-500"
                autoFocus
              />
            </div>

            <div className="overflow-y-auto flex-1">
              {loading ? (
                <div className="p-3 text-center text-coffee-500 dark:text-coffee-400 text-xs">
                  Cargando...
                </div>
              ) : filtered.length === 0 ? (
                <div className="p-3 text-center text-coffee-500 dark:text-coffee-400 text-xs">
                  Sin resultados
                </div>
              ) : (
                filtered.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      onChange(c.id);
                      setOpen(false);
                      setSearch('');
                    }}
                    className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                      c.id === value
                        ? 'bg-gold-600/20 text-gold-500'
                        : 'text-coffee-900 dark:text-cream hover:bg-coffee-100 dark:hover:bg-coffee-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.nombre}</p>
                        <p className="text-xs text-coffee-500 dark:text-coffee-400 truncate">
                          {c.region}
                        </p>
                      </div>
                      {c.id === value && <span className="ml-2 text-gold-500">✓</span>}
                    </div>
                  </button>
                ))
              )}
            </div>

            {value && (
              <div className="border-t border-coffee-200 dark:border-coffee-700 p-2">
                <button
                  type="button"
                  onClick={() => {
                    onChange('');
                    setSearch('');
                  }}
                  className="w-full flex items-center justify-center gap-2 px-3 py-1.5 text-xs text-coffee-500 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
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
