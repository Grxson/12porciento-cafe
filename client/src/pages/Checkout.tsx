import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft } from 'lucide-react';
import { ordersApi, paymentsApi } from '../api';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import StripePaymentForm from '../components/StripePaymentForm';

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
  const user = useUser((s) => s.user);
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>({
    customerName: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    address: user?.address ?? '',
    city: user?.city ?? '',
    state: user?.state ?? '',
    zipCode: user?.zipCode ?? '',
    notes: '',
  });
  const [clientSecret, setClientSecret] = useState('');
  const [intentAmount, setIntentAmount] = useState(0);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    setLoadingIntent(true);
    setError('');
    try {
      const res = await paymentsApi.createIntent({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
      });
      setClientSecret(res.data.clientSecret);
      setIntentAmount(res.data.amount);
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar el pago. Intenta de nuevo.');
    } finally {
      setLoadingIntent(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      await ordersApi.create({
        ...form,
        ...(user ? { userId: user.id } : {}),
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      });
    } catch {
      // Order creation best-effort — payment already confirmed
    }
    clearCart();
    setSuccess(true);
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
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
            Tu pago fue procesado exitosamente. Tostamos a pedido para garantizar frescura máxima — recibirás
            tu café dentro de los próximos 3-5 días hábiles.
          </p>
          {!user && (
            <div className="bg-coffee-800 border border-coffee-700 p-5 mb-6 text-left">
              <p className="text-cream text-sm font-medium mb-1">¿Quieres rastrear este pedido?</p>
              <p className="text-coffee-400 text-xs mb-3">
                Crea tu cuenta con el mismo email y podrás ver tu historial de pedidos.
              </p>
              <Link
                to={`/registro?email=${encodeURIComponent(form.email)}`}
                className="btn-primary text-sm inline-block"
              >
                Crear cuenta gratuita
              </Link>
            </div>
          )}
          <Link to="/tienda" className="btn-primary block">Seguir comprando</Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="gold-line mb-4" />
        <h1 className="font-serif text-4xl text-coffee-900 mb-4">Checkout</h1>

        {/* Step indicator */}
        <div className="flex items-center gap-3 mb-10">
          {[
            { n: 1, label: 'Datos de envío' },
            { n: 2, label: 'Pago' },
          ].map(({ n, label }, i, arr) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step >= n ? 'bg-gold-500 text-coffee-950' : 'bg-coffee-100 text-coffee-400'
              }`}>
                {step > n ? <Check className="w-3.5 h-3.5" /> : n}
              </div>
              <span className={`text-sm transition-colors ${step === n ? 'text-coffee-900 font-medium' : 'text-coffee-400'}`}>
                {label}
              </span>
              {i < arr.length - 1 && <ChevronRight className="w-4 h-4 text-coffee-300 ml-1" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.form
                  key="step1"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                  onSubmit={handleShippingSubmit}
                  className="space-y-4"
                >
                  <h2 className="font-serif text-xl text-coffee-900 mb-4">Datos de envío</h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {[
                      { name: 'customerName', label: 'Nombre completo *', placeholder: 'Tu nombre', required: true },
                      { name: 'email', label: 'Email *', placeholder: 'tu@email.com', required: true, type: 'email' },
                    ].map(({ name, label, placeholder, required, type = 'text' }) => (
                      <div key={name}>
                        <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">{label}</label>
                        <input
                          name={name} type={type} required={required}
                          value={(form as any)[name]} onChange={handleChange}
                          className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                          placeholder={placeholder}
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Teléfono</label>
                    <input name="phone" value={form.phone} onChange={handleChange}
                      className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                      placeholder="55 1234 5678" />
                  </div>

                  <div>
                    <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Dirección *</label>
                    <input name="address" required value={form.address} onChange={handleChange}
                      className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                      placeholder="Calle, número, colonia" />
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Ciudad *</label>
                      <input name="city" required value={form.city} onChange={handleChange}
                        className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                        placeholder="Ciudad" />
                    </div>
                    <div>
                      <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Estado *</label>
                      <select name="state" required value={form.state} onChange={handleChange}
                        className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none">
                        <option value="">Seleccionar</option>
                        {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">CP *</label>
                      <input name="zipCode" required value={form.zipCode} onChange={handleChange}
                        className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                        placeholder="12345" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Notas adicionales</label>
                    <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                      className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none resize-none"
                      placeholder="Instrucciones especiales..." />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button type="submit" disabled={loadingIntent}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loadingIntent ? 'Iniciando pago...' : (
                      <><span>Continuar al pago</span><ChevronRight className="w-4 h-4" /></>
                    )}
                  </button>
                </motion.form>
              )}

              {step === 2 && clientSecret && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button onClick={() => { setStep(1); setError(''); }}
                      className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 transition-colors text-sm">
                      <ChevronLeft className="w-4 h-4" /> Volver a envío
                    </button>
                  </div>
                  <h2 className="font-serif text-xl text-coffee-900 mb-6">Pago seguro</h2>

                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                  <StripePaymentForm
                    clientSecret={clientSecret}
                    amount={intentAmount}
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

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
