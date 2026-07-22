import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight, Tag, Package } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useCart } from '../context/CartContext';
import { resolveImageUrl } from '../utils/imageUrl';
import type { CartItemFull } from '../types';
import { PageMeta } from '../hooks/usePageMeta';

function getItemKey(item: CartItemFull): string {
  return item.itemType === 'product' ? `prod_${item.product.id}` : `bund_${item.bundleId}`;
}

function ProductCartItem({ item }: { item: CartItemFull & { itemType: 'product' } }) {
  const removeItem = useCart((s) => s.removeItem);
  const updateQuantity = useCart((s) => s.updateQuantity);
  const { product, quantity } = item;
  const key = getItemKey(item);

  return (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 hover:border-coffee-300 dark:hover:border-coffee-600 transition-colors p-4 flex gap-4"
    >
      <Link to={`/tienda/${product.slug}`} className="shrink-0">
        <img
          src={resolveImageUrl(product.imageUrl)}
          alt={product.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover shrink-0"
        />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/tienda/${product.slug}`}
              className="font-serif text-lg text-coffee-900 dark:text-cream hover:text-gold-600 transition-colors leading-snug block truncate"
            >
              {product.name}
            </Link>
            <div className="flex items-center gap-2 mt-1">
              {product.region && <span className="text-coffee-500 text-xs">{product.region}</span>}
              {product.weight && (
                <span className="flex items-center gap-1 text-coffee-600 dark:text-coffee-400 text-xs border border-coffee-200 dark:border-coffee-700 px-1.5 py-0.5">
                  <Tag className="w-2.5 h-2.5" />
                  {product.weight}g
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => removeItem(key)}
            aria-label="Eliminar producto"
            className="text-coffee-700 dark:text-coffee-300 hover:text-red-400 transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center border border-coffee-200 dark:border-coffee-700">
            <button
              onClick={() => updateQuantity(key, quantity - 1)}
              aria-label="Reducir cantidad"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-coffee-500 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-100 dark:hover:bg-coffee-700 transition-colors cursor-pointer"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="w-10 text-center text-coffee-900 dark:text-cream text-sm font-medium">
              {quantity}
            </span>
            <button
              onClick={() => updateQuantity(key, quantity + 1)}
              aria-label="Aumentar cantidad"
              className="min-w-[44px] min-h-[44px] flex items-center justify-center text-coffee-500 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-100 dark:hover:bg-coffee-700 transition-colors cursor-pointer"
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
          <p className="font-semibold text-coffee-900 dark:text-cream text-lg">
            ${(Number(product.price) * quantity).toLocaleString('es-MX')}
            <span className="text-coffee-600 dark:text-coffee-400 text-xs font-normal ml-1">
              MXN
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function BundleCartItem({ item }: { item: CartItemFull & { itemType: 'bundle' } }) {
  const removeItem = useCart((s) => s.removeItem);
  const { bundle } = item;
  const key = getItemKey(item);

  return (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20, transition: { duration: 0.2 } }}
      className="bg-white dark:bg-coffee-800 border border-gold-500/30 hover:border-gold-500/50 transition-colors p-4 flex gap-4"
    >
      {bundle.imageUrl ? (
        <img
          src={bundle.imageUrl}
          alt={bundle.name}
          className="w-20 h-20 sm:w-24 sm:h-24 object-cover shrink-0"
        />
      ) : (
        <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center shrink-0">
          <Package className="w-8 h-8 text-gold-500" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-serif text-lg text-coffee-900 dark:text-cream leading-snug block truncate">
              {bundle.name}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="bg-gold-500/20 text-gold-600 text-xs px-1.5 py-0.5">Paquete</span>
              {bundle.discountPct > 0 && (
                <span className="text-gold-600 text-xs font-semibold">
                  {bundle.discountPct}% OFF
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => removeItem(key)}
            aria-label="Eliminar paquete"
            className="text-coffee-700 dark:text-coffee-300 hover:text-red-400 transition-colors cursor-pointer shrink-0 min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {bundle.items.map((bi) => (
            <span key={bi.id} className="text-coffee-600 dark:text-coffee-400 text-xs">
              {bi.quantity > 1 ? `${bi.quantity}x ` : ''}
              {bi.product?.name || 'Producto'}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between mt-4">
          <span className="text-coffee-500 text-xs">Cantidad: 1</span>
          <p className="font-semibold text-gold-600 text-lg">
            ${Number(bundle?.finalPrice ?? 0).toLocaleString('es-MX')}
            <span className="text-coffee-600 dark:text-coffee-400 text-xs font-normal ml-1">
              MXN
            </span>
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Cart() {
  const { items, total, count } = useCart(
    useShallow((s) => ({ items: s.items, total: s.total, count: s.count })),
  );

  if (count() === 0) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-6 px-4 bg-coffee-50 dark:bg-coffee-950">
        <PageMeta title="Carrito" description="Revisa tu carrito de compras antes de pagar." />
        <div className="w-24 h-24 border border-coffee-200 dark:border-coffee-800 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-coffee-700 dark:text-coffee-300" />
        </div>
        <div className="text-center">
          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-2">
            Carrito vacío
          </h2>
          <p className="text-coffee-500 max-w-xs leading-relaxed text-sm">
            Aún no has agregado ningún café. Explora nuestra selección de especialidad.
          </p>
        </div>
        <Link to="/tienda" className="btn-primary">
          Explorar tienda
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24 md:pb-0 bg-coffee-50 dark:bg-coffee-950">
      <PageMeta title="Carrito" description="Revisa tu carrito de compras antes de pagar." />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-10">
          <div className="gold-line mb-4" />
          <h1 className="font-serif text-4xl md:text-5xl text-coffee-900 dark:text-cream">
            Carrito
          </h1>
          <p className="text-coffee-500 text-sm mt-2">
            {count()} producto{count() !== 1 ? 's' : ''} seleccionado{count() !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence initial={false}>
              {items.map((item) =>
                item.itemType === 'product' ? (
                  <ProductCartItem key={getItemKey(item)} item={item} />
                ) : (
                  <BundleCartItem key={getItemKey(item)} item={item} />
                ),
              )}
            </AnimatePresence>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-6 sticky top-16 md:top-24">
              <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5">Resumen</h3>

              <div className="space-y-2 mb-5 pb-5 border-b border-coffee-100 dark:border-coffee-700">
                {items.map((item) => {
                  const key = getItemKey(item);
                  if (item.itemType === 'product') {
                    return (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-coffee-600 dark:text-coffee-400 truncate pr-2">
                          {item.product?.name ?? 'Producto'} ×{item.quantity}
                        </span>
                        <span className="text-coffee-900 dark:text-cream shrink-0">
                          ${(Number(item.product.price) * item.quantity).toLocaleString('es-MX')}
                        </span>
                      </div>
                    );
                  }
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-coffee-600 dark:text-coffee-400 truncate pr-2">
                        🎁 {item.bundle?.name ?? 'Paquete'} ×{item.quantity}
                      </span>
                      <span className="text-coffee-900 dark:text-cream shrink-0">
                        $
                        {(Number(item.bundle?.finalPrice ?? 0) * item.quantity).toLocaleString(
                          'es-MX',
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between items-baseline mb-1">
                <span className="text-coffee-500 dark:text-coffee-400 text-sm">Subtotal</span>
                <span className="font-serif text-2xl text-coffee-900 dark:text-cream">
                  ${total().toLocaleString('es-MX')}
                </span>
              </div>
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mb-6">
                + envío según destino
              </p>

              <Link
                to="/checkout"
                className="btn-primary w-full min-h-[52px] flex items-center justify-center gap-2"
              >
                Proceder al pago <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                to="/tienda"
                className="block text-center text-coffee-500 dark:text-coffee-400 hover:text-coffee-800 dark:hover:text-cream text-xs mt-4 transition-colors tracking-wide"
              >
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
