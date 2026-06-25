import { useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
        <p className="text-coffee-900 dark:text-cream text-sm font-medium leading-tight truncate">{product.name}</p>
        {product.weight && <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{product.weight}g</p>}
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
            className="w-11 h-11 border border-coffee-300 dark:border-coffee-600 flex items-center justify-center hover:border-gold-500 transition-colors"
          >
            <Minus className="w-3 h-3 text-coffee-600 dark:text-coffee-400" />
          </button>
          <span className="text-coffee-900 dark:text-cream text-sm w-5 text-center">{quantity}</span>
          <button
            onClick={() => updateQuantity(key, quantity + 1)}
            className="w-11 h-11 border border-coffee-300 dark:border-coffee-600 flex items-center justify-center hover:border-gold-500 transition-colors"
          >
            <Plus className="w-3 h-3 text-coffee-600 dark:text-coffee-400" />
          </button>
        </div>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button onClick={() => removeItem(key)} className="flex w-10 h-10 items-center justify-center text-coffee-400 dark:text-coffee-300 hover:text-red-400 transition-colors">
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
        <p className="text-coffee-900 dark:text-cream text-sm font-medium leading-tight">{bundle.name}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="bg-gold-500/20 text-gold-600 text-[10px] px-1.5 py-0.5">Paquete</span>
          {bundle.discountPct > 0 && (
            <span className="text-gold-600 text-[10px]">{bundle.discountPct}% OFF</span>
          )}
        </div>
        <p className="text-coffee-600 dark:text-coffee-400 text-[10px] mt-1">
          {bundle.items.map((bi) => bi.product?.name || 'Producto').join(', ')}
        </p>
      </div>
      <div className="flex flex-col items-end justify-between shrink-0">
        <button onClick={() => removeItem(key)} className="flex w-10 h-10 items-center justify-center text-coffee-400 dark:text-coffee-300 hover:text-red-400 transition-colors">
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
  const { pathname } = useLocation();

  // Close drawer on route change
  useEffect(() => { if (drawerOpen) closeDrawer(); }, [pathname]);

  // Focus trap: focus close button when drawer opens
  useEffect(() => {
    if (drawerOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [drawerOpen]);

  // Lock body scroll when drawer open
  useEffect(() => {
    document.body.style.overflow = drawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [drawerOpen]);

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-coffee-950/60 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white dark:bg-coffee-900 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-200 dark:border-coffee-700">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold-500" />
                <span className="font-serif text-lg text-coffee-900 dark:text-cream">Tu carrito</span>
                {items.length > 0 && (
                  <span className="text-xs text-coffee-500">({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                )}
              </div>
              <button ref={closeButtonRef} onClick={closeDrawer} className="text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-coffee-300 dark:text-coffee-200 mb-4" />
                  <p className="font-serif text-coffee-700 dark:text-coffee-300 text-lg mb-1">Carrito vacío</p>
                  <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">Agrega productos de nuestra tienda</p>
                  <button onClick={closeDrawer} className="btn-outline text-sm px-6 py-2">
                    Explorar tienda
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map((item) =>
                    item.itemType === 'product'
                      ? <ProductDrawerItem key={getItemKey(item)} item={item} />
                      : <BundleDrawerItem key={getItemKey(item)} item={item} />,
                  )}
                </AnimatePresence>
              )}
            </div>

            {items.length > 0 && (
              <div
                className="px-5 pt-4 border-t border-coffee-200 dark:border-coffee-700 bg-coffee-50 dark:bg-coffee-800"
                style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1rem)' }}
              >
                <div className="flex justify-between mb-4">
                  <span className="text-coffee-700 dark:text-coffee-300 font-medium">Subtotal</span>
                  <span className="font-serif text-coffee-900 dark:text-cream text-lg">
                    ${total().toLocaleString('es-MX')} <span className="text-sm text-coffee-500">MXN</span>
                  </span>
                </div>
                <div className="space-y-2">
                  <Link to="/checkout" onClick={closeDrawer} className="btn-primary w-full block text-center">
                    Proceder al pago
                  </Link>
                  <Link to="/carrito" onClick={closeDrawer} className="btn-outline w-full block text-center text-sm py-2.5">
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