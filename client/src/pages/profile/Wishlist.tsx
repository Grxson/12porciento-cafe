import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Heart,
  ShoppingBag,
  Trash2,
  AlertTriangle,
  CheckCircle,
  PackageX,
  WifiOff,
} from 'lucide-react';
import { useWishlist } from '../../context/WishlistContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { PageMeta } from '../../hooks/usePageMeta';
import StaleDataBadge from '../../components/StaleDataBadge';
import type { Product } from '../../types';

function OfflineBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-400/40 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300 text-sm mb-4">
      <WifiOff className="w-4 h-4 shrink-0" />
      {message}
    </div>
  );
}

export default function Wishlist() {
  const { items, loading, error, isOffline, lastSyncAt, fetchItems, removeItem } = useWishlist();
  const addItem = useCart((s) => s.addItem);
  const { add: addToast } = useToast();

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleRemove = async (productId: string) => {
    await removeItem(productId);
    addToast('Eliminado de lista de deseos', 'success');
  };

  const handleAddToCart = (product: Product) => {
    addItem(product, 1);
    addToast(`${product.name} agregado al carrito`, 'success');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Lista de Deseos" />
        <p className="text-red-500 mb-4">{error}</p>
        <button onClick={fetchItems} className="btn-primary">
          Reintentar
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Lista de Deseos" />
        <Heart className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-600 dark:text-coffee-400 mb-4">Tu lista de deseos está vacía</p>
        <Link to="/tienda" className="btn-primary">
          Explorar cafés
        </Link>
      </div>
    );
  }

  return (
    <div>
      <PageMeta title="Lista de Deseos" />
      {isOffline && <StaleDataBadge cachedAt={lastSyncAt ?? undefined} className="mb-4 w-full" />}
      <div className="space-y-4">
        {items.map((item, i) => {
          const product = item.product;
          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 flex items-center gap-4"
            >
              <Link to={`/tienda/${product.slug}`} className="shrink-0">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="w-20 h-20 object-cover bg-coffee-100 dark:bg-coffee-800"
                />
              </Link>
              <div className="flex-1 min-w-0">
                <Link
                  to={`/tienda/${product.slug}`}
                  className="text-coffee-900 dark:text-cream font-medium hover:text-gold-500 transition-colors line-clamp-1"
                >
                  {product.name}
                </Link>
                <p className="text-coffee-500 dark:text-coffee-400 text-sm mt-0.5">
                  ${product.price} MXN
                </p>
                <div className="mt-1">
                  {product.stock === 0 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-red-500">
                      <PackageX className="w-3 h-3" /> Agotado
                    </span>
                  ) : product.stock <= 5 ? (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-500">
                      <AlertTriangle className="w-3 h-3" /> Quedan {product.stock}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs text-green-600">
                      <CheckCircle className="w-3 h-3" /> En stock
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleAddToCart(product)}
                  disabled={product.stock === 0}
                  className="p-2 bg-gold-500/10 hover:bg-gold-500/20 text-gold-600 dark:text-gold-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Agregar al carrito"
                >
                  <ShoppingBag className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleRemove(product.id)}
                  className="p-2 text-coffee-400 hover:text-red-500 transition-colors"
                  title="Eliminar de lista de deseos"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
