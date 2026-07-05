import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Coffee, ShoppingBag, RotateCw } from 'lucide-react';
import { baristaApi } from '../../api/barista';
import { productsApi } from '../../api';
import { useUser } from '../../context/UserContext';
import { PageMeta } from '../../hooks/usePageMeta';
import type { BrewLog, Product } from '../../types';

export default function CoffeeTracker() {
  const user = useUser((s) => s.user);
  const userId = user?.id;

  const {
    data: brewsResp,
    isLoading: brewsLoading,
    isError: brewsError,
    refetch: refetchBrews,
  } = useQuery({
    queryKey: ['barista-brews', userId],
    queryFn: () =>
      baristaApi.getUserBrews(userId!, { limit: '500' }).then((r) => r.data as BrewLog[]),
    enabled: !!userId,
  });

  const { data: productsResp, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list().then((r) => r.data),
    staleTime: 1000 * 60 * 5,
  });

  const brews = Array.isArray(brewsResp) ? brewsResp : [];
  const products = productsResp?.data ?? [];

  const coffeeCounts = useMemo(() => {
    const grouped: Record<string, { count: number; product: Product | null }> = {};

    for (const brew of brews) {
      if (!brew.beanId) continue;
      if (!grouped[brew.beanId]) {
        const product = products.find((p) => p.id === brew.beanId) ?? null;
        grouped[brew.beanId] = { count: 0, product };
      }
      grouped[brew.beanId].count++;
    }

    return Object.values(grouped)
      .filter((entry) => entry.product)
      .sort((a, b) => b.count - a.count);
  }, [brews, products]);

  const isLoading = brewsLoading || productsLoading;

  if (isLoading) {
    return (
      <div>
        <PageMeta title="Mis Cafés" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden animate-pulse"
            >
              <div className="aspect-square bg-coffee-200 dark:bg-coffee-700" />
              <div className="p-3 space-y-2">
                <div className="h-4 bg-coffee-200 dark:bg-coffee-700 rounded w-3/4" />
                <div className="h-3 bg-coffee-200 dark:bg-coffee-700 rounded w-1/2" />
                <div className="h-5 bg-coffee-200 dark:bg-coffee-700 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (brewsError) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Mis Cafés" />
        <p className="text-red-500 mb-4">Error al cargar tus cafés</p>
        <button
          onClick={() => refetchBrews()}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-coffee-950 px-4 py-2 text-sm font-medium transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (coffeeCounts.length === 0) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Mis Cafés" />
        <Coffee className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-600 dark:text-coffee-400 mb-4">
          No has registrado cafés en tus brews
        </p>
        <Link
          to="/tienda"
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-coffee-950 px-4 py-2 text-sm font-medium transition-colors"
        >
          <ShoppingBag className="w-4 h-4" />
          Explorar cafés
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageMeta title="Mis Cafés" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {coffeeCounts.map((entry, i) => {
          const product = entry.product!;
          return (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link
                to={`/tienda/${product.slug}`}
                className="block bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden hover:border-gold-500/50 transition-colors group"
              >
                <div className="aspect-square overflow-hidden bg-coffee-100 dark:bg-coffee-800">
                  {product.imageUrl ? (
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Coffee className="w-10 h-10 text-coffee-400 dark:text-coffee-600" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-medium text-sm text-coffee-900 dark:text-cream line-clamp-1 group-hover:text-gold-500 transition-colors">
                    {product.name}
                  </h3>
                  {(product.origin || product.region) && (
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-0.5">
                      {[product.origin, product.region].filter(Boolean).join(', ')}
                    </p>
                  )}
                  <span className="inline-flex items-center gap-1 mt-2 text-xs font-medium bg-gold-500/10 text-gold-600 dark:text-gold-400 px-2 py-0.5">
                    <Coffee className="w-3 h-3" />
                    {entry.count} {entry.count === 1 ? 'brew' : 'brews'}
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
