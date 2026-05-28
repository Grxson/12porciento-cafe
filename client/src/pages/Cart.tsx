import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function Cart() {
  const { items, removeItem, updateQuantity, total, count } = useCart();

  if (count() === 0) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-20 h-20 border-2 border-coffee-300 flex items-center justify-center">
          <ShoppingBag className="w-8 h-8 text-coffee-400" />
        </div>
        <h2 className="font-serif text-3xl text-coffee-900">Carrito vacío</h2>
        <p className="text-coffee-600 text-center max-w-xs">
          Aún no has agregado ningún café. Explora nuestra selección de lotes de especialidad.
        </p>
        <Link to="/tienda" className="btn-primary">Explorar tienda</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="gold-line mb-4" />
        <h1 className="font-serif text-4xl text-coffee-900 mb-10">
          Carrito <span className="text-coffee-500 text-2xl font-normal">({count()} productos)</span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items */}
          <div className="lg:col-span-2 space-y-3">
            <AnimatePresence>
              {items.map(({ product, quantity }) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-white border border-coffee-200 p-4 flex gap-4"
                >
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-20 h-20 object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <Link
                          to={`/tienda/${product.slug}`}
                          className="font-serif text-lg text-coffee-900 hover:text-gold-600 transition-colors"
                        >
                          {product.name}
                        </Link>
                        <p className="text-coffee-500 text-xs mt-0.5">{product.region} · {product.weight}g</p>
                      </div>
                      <button
                        onClick={() => removeItem(product.id)}
                        className="text-coffee-600 hover:text-red-400 transition-colors ml-3 shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center border border-coffee-300">
                        <button
                          onClick={() => updateQuantity(product.id, quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-coffee-500 hover:text-coffee-900 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-coffee-900 text-sm">{quantity}</span>
                        <button
                          onClick={() => updateQuantity(product.id, quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-coffee-500 hover:text-coffee-900 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <p className="text-gold-500 font-semibold">
                        ${(product.price * quantity).toLocaleString('es-MX')}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* Summary */}
          <div>
            <div className="bg-white border border-coffee-200 p-6 sticky top-24">
              <h3 className="font-serif text-xl text-coffee-900 mb-5">Resumen</h3>
              <div className="space-y-3 mb-5">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex justify-between text-sm">
                    <span className="text-coffee-600 truncate pr-2">{product.name} x{quantity}</span>
                    <span className="text-coffee-800 shrink-0">${(product.price * quantity).toLocaleString('es-MX')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-coffee-200 pt-4 mb-6">
                <div className="flex justify-between">
                  <span className="text-coffee-700">Subtotal</span>
                  <span className="text-coffee-900 font-semibold">${total().toLocaleString('es-MX')}</span>
                </div>
                <p className="text-coffee-500 text-xs mt-2">Envío calculado al hacer checkout</p>
              </div>
              <Link to="/checkout" className="btn-primary w-full flex items-center justify-center gap-2">
                Proceder al pago <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/tienda" className="block text-center text-coffee-500 hover:text-coffee-900 text-sm mt-4 transition-colors">
                Seguir comprando
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
