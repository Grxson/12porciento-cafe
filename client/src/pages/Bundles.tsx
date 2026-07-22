import { useEffect, useState } from 'react';
import { ShoppingBag, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import { bundlesApi } from '../api';
import { useCart } from '../context/CartContext';
import type { Bundle } from '../types';
import { PageMeta } from '../hooks/usePageMeta';
import Breadcrumbs from '../components/Breadcrumbs';

function BundleSkeleton() {
  return (
    <div className="border border-coffee-200 dark:border-coffee-800">
      <div className="aspect-[4/3] shimmer" />
      <div className="p-5 space-y-3">
        <div className="shimmer h-3 w-1/4" />
        <div className="shimmer h-5 w-3/4" />
        <div className="shimmer h-4 w-full" />
        <div className="shimmer h-4 w-2/3" />
        <div className="pt-3 border-t border-coffee-200 dark:border-coffee-800 flex justify-between">
          <div className="shimmer h-6 w-20" />
          <div className="shimmer h-6 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function Bundles() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [bundlesError, setBundlesError] = useState('');
  const [addingId, setAddingId] = useState<string | null>(null);
  const addBundle = useCart((s) => s.addBundle);

  useEffect(() => {
    bundlesApi
      .list()
      .then((res) => setBundles(res.data.data || []))
      .catch(() => setBundlesError('Error al cargar paquetes'))
      .finally(() => setLoading(false));
  }, []);

  const handleAddToCart = async (bundle: Bundle) => {
    setAddingId(bundle.id);
    try {
      addBundle(bundle);
    } finally {
      setAddingId(null);
    }
  };

  return (
    <div className="min-h-dvh bg-coffee-50 py-6 dark:bg-coffee-950 sm:py-10">
      <PageMeta
        title="Paquetes"
        description="Paquetes y combos de café de especialidad con descuento."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs crumbs={[{ label: 'Inicio', to: '/' }, { label: 'Paquetes' }]} />
        <div className="gold-line mb-4" />
        <div className="flex items-center gap-3 mb-2">
          <Package className="w-6 h-6 text-gold-500" />
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream">Paquetes</h1>
        </div>
        <p className="text-coffee-600 dark:text-coffee-400 mb-10">
          Combos exclusivos con descuento — café y accesorios juntos.
        </p>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <BundleSkeleton key={i} />
            ))}
          </div>
        ) : bundlesError ? (
          <div className="text-center py-20">
            <p className="text-red-500 text-lg mb-3">{bundlesError}</p>
            <button
              onClick={() => {
                setLoading(true);
                setBundlesError('');
                bundlesApi
                  .list()
                  .then((res) => setBundles(res.data.data || []))
                  .catch(() => setBundlesError('Error al cargar paquetes'))
                  .finally(() => setLoading(false));
              }}
              className="inline-flex min-h-12 items-center px-4 text-sm text-gold-500 underline hover:text-gold-400"
            >
              Reintentar
            </button>
          </div>
        ) : bundles.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-gold-500 flex items-center justify-center">
              <Package className="w-10 h-10 text-gold-500" />
            </div>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
              No hay paquetes disponibles
            </h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-8 max-w-sm mx-auto">
              Vuelve pronto para descubrir nuevas ofertas
            </p>
            <Link to="/tienda" className="btn-primary inline-flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Ver tienda
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {bundles.map((bundle) => (
              <div
                key={bundle.id}
                className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden flex flex-col"
              >
                {bundle.imageUrl ? (
                  <img
                    src={bundle.imageUrl}
                    alt={bundle.name}
                    className="w-full aspect-[4/3] object-cover"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center">
                    <Package className="w-12 h-12 text-coffee-400" />
                  </div>
                )}

                <div className="p-5 flex flex-col flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-serif text-xl text-coffee-900 dark:text-cream leading-tight">
                      {bundle.name}
                    </h3>
                    {bundle.discountPct > 0 && (
                      <span className="bg-gold-500/20 text-gold-600 text-xs font-semibold px-2 py-0.5 shrink-0">
                        {bundle.discountPct}% OFF
                      </span>
                    )}
                  </div>

                  <p className="text-coffee-600 dark:text-coffee-400 text-sm leading-relaxed mb-4 flex-1">
                    {bundle.description}
                  </p>

                  <div className="space-y-1.5 mb-5">
                    <p className="text-xs text-coffee-500 uppercase tracking-widest">Incluye</p>
                    {bundle.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-2 text-sm text-coffee-700 dark:text-coffee-300"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-gold-500 shrink-0" />
                        <span className="font-medium">
                          {item.quantity > 1 ? `${item.quantity}x ` : ''}
                          {item.product?.name || 'Producto'}
                        </span>
                        {item.product?.price && (
                          <span className="ml-auto shrink-0 text-xs text-coffee-500">
                            ${Number(item.product.price).toLocaleString('es-MX')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-coffee-200 dark:border-coffee-800 pt-4 flex items-end justify-between">
                    <div>
                      {bundle.discountPct > 0 && (
                        <p className="text-coffee-500 text-xs line-through">
                          ${Number(bundle.basePrice).toLocaleString('es-MX')}
                        </p>
                      )}
                      <p className="text-gold-500 text-2xl font-semibold">
                        ${Number(bundle?.finalPrice ?? 0).toLocaleString('es-MX')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleAddToCart(bundle)}
                      disabled={addingId === bundle.id}
                      className="btn-primary min-h-12 flex items-center gap-2 px-5 text-sm disabled:opacity-50"
                    >
                      {addingId === bundle.id ? (
                        <span className="w-4 h-4 border-2 border-coffee-950/30 border-t-coffee-950 rounded-full animate-spin" />
                      ) : (
                        <ShoppingBag className="w-4 h-4" />
                      )}
                      Agregar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
