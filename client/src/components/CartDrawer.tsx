import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2, Package } from 'lucide-react';
import { useCart } from '../context/CartContext';
import type { CartItemFull } from '../types';

function getItemKey(item: CartItemFull): string {
  return item.itemType === 'product' ? `prod_${item.product.id}` : `bund_${item.bundleId}`;
}

function ProductDrawerItem({ item }: { item: CartItemFull & { itemType: 'product' } }) {
  const { updateQuantity, removeItem } = useCart();
  const { product, quantity } = item;
  const key = getItemKey(item);

  return (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex gap-3 py-4 border-b border-coffee-100 dark:border-coffee-800 last:border-0"
    >
      <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="line-clamp-2 text-sm font-medium leading-tight text-coffee-900 dark:text-cream">
          {product.name}
        </p>
        {product.weight && (
          <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{product.weight}g</p>
        )}
        {product.stock <= 5 && product.stock > 0 && (
          <div className="inline-flex items-center gap-1.5 bg-amber-500/20 border border-amber-500/40 text-amber-600 dark:text-amber-400 text-xs px-2.5 py-1 font-medium tracking-wide mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Stock bajo
          </div>
        )}
        {product.stock === 0 && (
          <div className="inline-flex items-center gap-1.5 bg-red-500/20 border border-red-500/40 text-red-600 dark:text-red-400 text-xs px-2.5 py-1 font-medium tracking-wide mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            Agotado
          </div>
        )}
        <div className="flex items-center gap-2 mt-2">
          <button
            onClick={() => updateQuantity(key, quantity - 1)}
            aria-label="Reducir cantidad"
            className="w-11 h-11 border border-coffee-300 dark:border-coffee-600 flex items-center justify-center hover:border-gold-500 transition-colors"
          >
            <Minus className="w-3 h-3 text-coffee-600 dark:text-coffee-400" />
          </button>
          <span className="text-coffee-900 dark:text-cream text-sm w-5 text-center">
            {quantity}
          </span>
          <button
            onClick={() => updateQuantity(key, quantity + 1)}
            aria-label="Aumentar cantidad"
            className="w-11 h-11 border border-coffee-300 dark:border-coffee-600 flex items-center justify-center hover:border-gold-500 transition-colors"
          >
            <Plus className="w-3 h-3 text-coffee-600 dark:text-coffee-400" />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onClick={() => removeItem(key)}
          aria-label="Eliminar producto"
          className="flex h-11 w-11 items-center justify-center text-coffee-400 dark:text-coffee-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <p className="text-coffee-900 dark:text-cream text-sm font-medium">
          ${(Number(product.price) * quantity).toLocaleString('es-MX')}
        </p>
      </div>
    </motion.div>
  );
}

function BundleDrawerItem({ item }: { item: CartItemFull & { itemType: 'bundle' } }) {
  const { removeItem } = useCart();
  const { bundle } = item;
  const key = getItemKey(item);

  return (
    <motion.div
      key={key}
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="flex gap-3 py-4 border-b border-gold-200 dark:border-gold-500/20 last:border-0"
    >
      {bundle.imageUrl ? (
        <img src={bundle.imageUrl} alt={bundle.name} className="w-16 h-16 object-cover shrink-0" />
      ) : (
        <div className="w-16 h-16 bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center shrink-0">
          <Package className="w-6 h-6 text-gold-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-coffee-900 dark:text-cream text-sm font-medium leading-tight">
          {bundle.name}
        </p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="bg-gold-500/20 text-gold-600 text-xs px-1.5 py-0.5">Paquete</span>
          {bundle.discountPct > 0 && (
            <span className="text-gold-600 text-xs">{bundle.discountPct}% OFF</span>
          )}
        </div>
        <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-1">
          {bundle.items.map((bi) => bi.product?.name || 'Producto').join(', ')}
        </p>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button
          onClick={() => removeItem(key)}
          aria-label="Eliminar producto"
          className="flex h-11 w-11 items-center justify-center text-coffee-400 dark:text-coffee-300 hover:text-red-400 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        <p className="text-gold-600 text-sm font-medium">
          ${Number(bundle?.finalPrice ?? 0).toLocaleString('es-MX')}
        </p>
      </div>
    </motion.div>
  );
}

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, total } = useCart();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reduceMotion = useReducedMotion();
  const { pathname } = useLocation();

  // Close drawer on route change — only for non-cart-related navigation
  useEffect(() => {
    if (
      drawerOpen &&
      !pathname.startsWith('/tienda') &&
      !pathname.startsWith('/paquetes') &&
      !pathname.startsWith('/suscripciones')
    ) {
      closeDrawer();
    }
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    openerRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeButtonRef.current?.focus());

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDrawer();
        return;
      }
      if (event.key !== 'Tab' || !drawerRef.current) return;
      const focusable = Array.from(
        drawerRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      openerRef.current?.focus();
    };
  }, [drawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-coffee-950/60 backdrop-blur-sm z-40"
          />
          <motion.div
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cart-drawer-title"
            initial={reduceMotion ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={
              reduceMotion ? { duration: 0 } : { type: 'spring', damping: 28, stiffness: 300 }
            }
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col bg-white shadow-2xl dark:bg-coffee-900"
            style={{ paddingTop: 'var(--app-safe-top)', paddingRight: 'var(--app-safe-right)' }}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-200 dark:border-coffee-700">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold-500" />
                <span
                  id="cart-drawer-title"
                  className="font-serif text-lg text-coffee-900 dark:text-cream"
                >
                  Tu carrito
                </span>
                {items.length > 0 && (
                  <span className="text-xs text-coffee-500">
                    ({items.length} {items.length === 1 ? 'producto' : 'productos'})
                  </span>
                )}
              </div>
              <button
                ref={closeButtonRef}
                onClick={closeDrawer}
                aria-label="Cerrar carrito"
                className="icon-button text-coffee-400 hover:text-coffee-900 dark:hover:text-cream"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-coffee-300 dark:text-coffee-200 mb-4" />
                  <p className="font-serif text-coffee-700 dark:text-coffee-300 text-lg mb-1">
                    Carrito vacío
                  </p>
                  <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                    Agrega productos de nuestra tienda
                  </p>
                  <button onClick={closeDrawer} className="btn-outline text-sm px-6 py-2">
                    Explorar tienda
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) =>
                    item.itemType === 'product' ? (
                      <ProductDrawerItem key={getItemKey(item)} item={item} />
                    ) : (
                      <BundleDrawerItem key={getItemKey(item)} item={item} />
                    ),
                  )}
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 && (
              <div
                className="px-5 pt-4 border-t border-coffee-200 dark:border-coffee-700 bg-coffee-50 dark:bg-coffee-800"
                style={{ paddingBottom: 'calc(var(--app-safe-bottom) + 1rem)' }}
              >
                <div className="flex justify-between mb-4">
                  <span className="text-coffee-700 dark:text-coffee-300 font-medium">Subtotal</span>
                  <span className="font-serif text-coffee-900 dark:text-cream text-lg">
                    ${total().toLocaleString('es-MX')}{' '}
                    <span className="text-sm text-coffee-500">MXN</span>
                  </span>
                </div>
                <div className="space-y-2">
                  <Link
                    to="/checkout"
                    onClick={closeDrawer}
                    className="btn-primary w-full block text-center"
                  >
                    Proceder al pago
                  </Link>
                  <Link
                    to="/carrito"
                    onClick={closeDrawer}
                    className="btn-outline w-full block text-center text-sm py-2.5"
                  >
                    Ver carrito completo
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
