import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Wrench } from 'lucide-react';
import { baristaApi } from '../api/barista';
import { productsApi } from '../api';
import type { Product } from '../types';

// ── Types ──

interface StatsData {
  favoriteMethod: string | null;
  brewsPerMethod: Record<string, number>;
  totalBrews: number;
}

// ── Equipment recommendation map ──

interface RecItem {
  name: string;
  keywords: string[];
}

const METHOD_RECS: Record<string, RecItem[]> = {
  V60: [
    { name: 'Hario V60 Dripper', keywords: ['v60', 'dripper'] },
    { name: 'Tetera de Cuello de Ganso', keywords: ['gooseneck', 'kettle', 'tetera'] },
    { name: 'Báscula de Precisión', keywords: ['scale', 'báscula'] },
    { name: 'Molino de Muelas Cónicas', keywords: ['grinder', 'burr', 'molino'] },
  ],
  AeroPress: [
    { name: 'AeroPress', keywords: ['aeropress'] },
    { name: 'Filtros AeroPress', keywords: ['aeropress', 'filter'] },
    { name: 'Tetera de Cuello de Ganso', keywords: ['gooseneck', 'kettle', 'tetera'] },
  ],
  Espresso: [
    { name: 'Máquina de Espresso', keywords: ['espresso', 'machine'] },
    { name: 'Tamper', keywords: ['tamper'] },
    { name: 'Distribuidor de Café', keywords: ['distribution', 'distributor', 'nivelador'] },
  ],
  Chemex: [
    { name: 'Chemex', keywords: ['chemex'] },
    { name: 'Filtros Chemex', keywords: ['chemex', 'filter'] },
    { name: 'Tetera de Cuello de Ganso', keywords: ['gooseneck', 'kettle', 'tetera'] },
  ],
  'French Press': [
    { name: 'French Press', keywords: ['french', 'prensa'] },
    { name: 'Molino para Molido Grueso', keywords: ['grinder', 'molino', 'grueso'] },
  ],
  Moka: [
    { name: 'Cafetera Moka', keywords: ['moka'] },
    { name: 'Molino para Molido Fino', keywords: ['grinder', 'molino', 'fino'] },
  ],
  'Cold Brew': [
    { name: 'Jarra para Cold Brew', keywords: ['cold brew', 'cold'] },
    { name: 'Molino para Molido Extra Grueso', keywords: ['grinder', 'molino', 'extra'] },
  ],
};

// ── Helpers ──

function findProduct(products: Product[], keywords: string[]): Product | undefined {
  return products.find((p) => {
    const name = p.name.toLowerCase();
    return keywords.some((k) => name.includes(k));
  });
}

// ── Component ──

interface EquipmentRecsProps {
  userId: string;
}

export default function EquipmentRecs({ userId }: EquipmentRecsProps) {
  const navigate = useNavigate();

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery({
    queryKey: ['barista-stats', userId],
    queryFn: () => baristaApi.getStats(userId).then((r) => r.data.data as StatsData),
    enabled: !!userId,
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['products', 'equipment-recs'],
    queryFn: () => productsApi.list().then((r) => r.data.data as Product[]),
  });

  const isLoading = statsLoading || productsLoading;

  const equipmentProducts = useMemo(() => {
    if (!productsData) return [];
    return productsData.filter((p) => p.category !== 'CAFÉ');
  }, [productsData]);

  const favoriteMethod = stats?.favoriteMethod ?? null;

  const recommendations = useMemo(() => {
    if (!favoriteMethod || !METHOD_RECS[favoriteMethod]) return [];
    return METHOD_RECS[favoriteMethod].map((rec) => ({
      ...rec,
      product: findProduct(equipmentProducts, rec.keywords),
    }));
  }, [favoriteMethod, equipmentProducts]);

  // User has no favorite method → hidden
  if (!statsLoading && !statsError && !favoriteMethod) return null;

  // Loading
  if (isLoading) {
    return (
      <section>
        <div className="shimmer dark:shimmer-dark h-6 w-64 mb-6 rounded" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-3"
            >
              <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full mx-auto" />
              <div className="shimmer dark:shimmer-dark h-4 w-24 mx-auto" />
            </div>
          ))}
        </div>
      </section>
    );
  }

  // No brews recorded yet
  if (stats && stats.totalBrews === 0) {
    return (
      <section className="text-center py-8">
        <Wrench className="w-10 h-10 mx-auto mb-3 text-coffee-400 dark:text-coffee-600" />
        <p className="text-coffee-600 dark:text-coffee-400 text-sm">
          Registra más brews para obtener recomendaciones
        </p>
      </section>
    );
  }

  // Error state — silent fail for secondary component
  if (statsError || !stats) return null;

  const methodLabel = favoriteMethod ?? '';

  return (
    <motion.section
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <h3 className="text-lg font-bold text-coffee-900 dark:text-cream mb-4">
        Equipo recomendado para {methodLabel}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {recommendations.slice(0, 4).map((rec) => (
          <button
            key={rec.name}
            type="button"
            onClick={() => {
              if (rec.product) {
                navigate(`/tienda/${rec.product.slug}`);
              } else {
                navigate(`/tienda?search=${encodeURIComponent(rec.name.split(' ')[0])}`);
              }
            }}
            className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 text-center hover:border-gold-500 transition-colors cursor-pointer"
          >
            <Wrench className="w-10 h-10 mx-auto mb-2 text-gold-500" />
            <p className="text-sm font-medium text-coffee-900 dark:text-cream">{rec.name}</p>
          </button>
        ))}
      </div>
    </motion.section>
  );
}
