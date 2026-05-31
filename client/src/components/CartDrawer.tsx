import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ShoppingBag, Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartDrawer() {
  const { items, drawerOpen, closeDrawer, updateQuantity, removeItem, total } = useCart();

  return (
    <AnimatePresence>
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeDrawer}
            className="fixed inset-0 bg-coffee-950/60 backdrop-blur-sm z-40"
          />
          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-sm bg-white shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-coffee-200">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-gold-500" />
                <span className="font-serif text-lg text-coffee-900">Tu carrito</span>
                {items.length > 0 && (
                  <span className="text-xs text-coffee-500">({items.length} {items.length === 1 ? 'producto' : 'productos'})</span>
                )}
              </div>
              <button onClick={closeDrawer} className="text-coffee-400 hover:text-coffee-900 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center py-12">
                  <ShoppingBag className="w-12 h-12 text-coffee-200 mb-4" />
                  <p className="font-serif text-coffee-700 text-lg mb-1">Carrito vacío</p>
                  <p className="text-coffee-400 text-sm mb-6">Agrega productos de nuestra tienda</p>
                  <button onClick={closeDrawer} className="btn-outline text-sm px-6 py-2">
                    Explorar tienda
                  </button>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {items.map(({ product, quantity }) => (
                    <motion.div
                      key={product.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex gap-3 py-4 border-b border-coffee-100 last:border-0"
                    >
                      <img src={product.imageUrl} alt={product.name} className="w-16 h-16 object-cover shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-coffee-900 text-sm font-medium leading-tight truncate">{product.name}</p>
                        {product.weight && <p className="text-coffee-400 text-xs mt-0.5">{product.weight}g</p>}
                        <div className="flex items-center gap-2 mt-2">
                          <button
                            onClick={() => updateQuantity(product.id, quantity - 1)}
                            className="w-6 h-6 border border-coffee-300 flex items-center justify-center hover:border-gold-500 transition-colors"
                          >
                            <Minus className="w-3 h-3 text-coffee-600" />
                          </button>
                          <span className="text-coffee-900 text-sm w-5 text-center">{quantity}</span>
                          <button
                            onClick={() => updateQuantity(product.id, quantity + 1)}
                            className="w-6 h-6 border border-coffee-300 flex items-center justify-center hover:border-gold-500 transition-colors"
                          >
                            <Plus className="w-3 h-3 text-coffee-600" />
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-col items-end justify-between shrink-0">
                        <button
                          onClick={() => removeItem(product.id)}
                          className="text-coffee-300 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <p className="text-coffee-900 text-sm font-medium">${(product.price * quantity).toLocaleString('es-MX')}</p>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-5 py-4 border-t border-coffee-200 bg-coffee-50">
                <div className="flex justify-between mb-4">
                  <span className="text-coffee-700 font-medium">Subtotal</span>
                  <span className="font-serif text-coffee-900 text-lg">${total().toLocaleString('es-MX')} <span className="text-sm text-coffee-500">MXN</span></span>
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
