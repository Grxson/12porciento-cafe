import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { ordersApi } from '../api';
import { useCart } from '../context/CartContext';

interface FormData {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
}

const mexicanStates = [
  'Aguascalientes','Baja California','Baja California Sur','Campeche','Chiapas','Chihuahua',
  'Ciudad de México','Coahuila','Colima','Durango','Estado de México','Guanajuato','Guerrero',
  'Hidalgo','Jalisco','Michoacán','Morelos','Nayarit','Nuevo León','Oaxaca','Puebla','Querétaro',
  'Quintana Roo','San Luis Potosí','Sinaloa','Sonora','Tabasco','Tamaulipas','Tlaxcala','Veracruz',
  'Yucatán','Zacatecas',
];

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>({
    customerName: '', email: '', phone: '', address: '', city: '', state: '', zipCode: '', notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoading(true);
    setError('');
    try {
      await ordersApi.create({
        ...form,
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      });
      clearCart();
      setSuccess(true);
    } catch {
      setError('Error al procesar el pedido. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-4">
        <p className="text-coffee-600">No hay productos en el carrito.</p>
        <Link to="/tienda" className="btn-primary">Ir a la tienda</Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-cream mb-3">¡Pedido confirmado!</h2>
          <p className="text-coffee-300 leading-relaxed mb-8">
            Hemos recibido tu pedido. Tostamos a pedido para garantizar frescura máxima — recibirás
            tu café dentro de los próximos 3-5 días hábiles.
          </p>
          <Link to="/tienda" className="btn-primary block">Seguir comprando</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="gold-line mb-4" />
        <h1 className="font-serif text-4xl text-coffee-900 mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-4">
            <h2 className="font-serif text-xl text-coffee-900 mb-4">Datos de envío</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'customerName', label: 'Nombre completo', placeholder: 'Tu nombre', required: true },
                { name: 'email', label: 'Email', placeholder: 'tu@email.com', required: true, type: 'email' },
              ].map(({ name, label, placeholder, required, type = 'text' }) => (
                <div key={name}>
                  <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">{label} {required && '*'}</label>
                  <input
                    name={name}
                    type={type}
                    required={required}
                    value={(form as any)[name]}
                    onChange={handleChange}
                    className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                    placeholder={placeholder}
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Teléfono</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                placeholder="55 1234 5678"
              />
            </div>

            <div>
              <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Dirección *</label>
              <input
                name="address"
                required
                value={form.address}
                onChange={handleChange}
                className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                placeholder="Calle, número, colonia"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Ciudad *</label>
                <input
                  name="city"
                  required
                  value={form.city}
                  onChange={handleChange}
                  className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                  placeholder="Ciudad"
                />
              </div>
              <div>
                <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Estado *</label>
                <select
                  name="state"
                  required
                  value={form.state}
                  onChange={handleChange}
                  className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                >
                  <option value="">Seleccionar</option>
                  {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">CP *</label>
                <input
                  name="zipCode"
                  required
                  value={form.zipCode}
                  onChange={handleChange}
                  className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors"
                  placeholder="12345"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Notas adicionales</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none transition-colors resize-none"
                placeholder="Instrucciones especiales, referencia de entrega..."
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : `Confirmar pedido — $${total().toLocaleString('es-MX')} MXN`}
            </button>

            <p className="text-coffee-500 text-xs text-center">
              El pago se coordina por transferencia. Te enviaremos los datos de pago al email proporcionado.
            </p>
          </form>

          {/* Order summary */}
          <div>
            <div className="bg-white border border-coffee-200 p-6 sticky top-24">
              <h3 className="font-serif text-xl text-coffee-900 mb-5">Tu pedido</h3>
              <div className="space-y-3 mb-5">
                {items.map(({ product, quantity }) => (
                  <div key={product.id} className="flex gap-3">
                    <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-coffee-900 text-sm leading-tight truncate">{product.name}</p>
                      <p className="text-coffee-500 text-xs">{product.weight}g · x{quantity}</p>
                    </div>
                    <p className="text-coffee-700 text-sm shrink-0">${(product.price * quantity).toLocaleString('es-MX')}</p>
                  </div>
                ))}
              </div>
              <div className="border-t border-coffee-200 pt-4">
                <div className="flex justify-between font-semibold">
                  <span className="text-coffee-900">Total</span>
                  <span className="text-gold-600 text-lg">${total().toLocaleString('es-MX')}</span>
                </div>
                <p className="text-coffee-500 text-xs mt-1">+ envío según destino</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
