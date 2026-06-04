import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, ChevronLeft, Tag, Loader2, MapPin } from 'lucide-react';
import { ordersApi, paymentsApi, promoCodesApi } from '../api';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import StripePaymentForm from '../components/StripePaymentForm';
import { mexicanStates } from '../constants/mexico';

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

const validateShipping = (form: FormData): Partial<Record<keyof FormData, string>> => {
  const errors: Partial<Record<keyof FormData, string>> = {};
  if (!form.customerName.trim() || form.customerName.trim().length < 2) {
    errors.customerName = 'Nombre requerido (mínimo 2 caracteres)';
  }
  if (!/^\d{5}$/.test(form.zipCode)) {
    errors.zipCode = 'CP debe ser 5 dígitos';
  }
  if (form.phone && !/^\d{10}$/.test(form.phone.replace(/[\s\-()]/g, ''))) {
    errors.phone = 'Teléfono debe ser 10 dígitos';
  }
  return errors;
};

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
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [intentAmount, setIntentAmount] = useState(0);
  const [loadingIntent, setLoadingIntent] = useState(false);
  const [error, setError] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [promoLoading, setPromoLoading] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name as keyof FormData]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: undefined }));
    }
  };

  const handleApplyPromo = async () => {
    if (!promoInput.trim()) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const res = await promoCodesApi.validate(promoInput.trim());
      const { discount, type } = res.data.data;
      const sub = total();
      const discountAmt = type === 'PERCENTAGE' ? sub * (discount / 100) : Math.min(discount, sub);
      setPromoCode(promoInput.trim().toUpperCase());
      setPromoDiscount(discountAmt);
    } catch (err: any) {
      setPromoError(err.response?.data?.error || 'Código inválido');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleShippingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) return;
    const validationErrors = validateShipping(form);
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    setLoadingIntent(true);
    setError('');
    try {
      const res = await paymentsApi.createIntent({
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        ...(promoCode ? { promoCode } : {}),
        ...(user?.stripeCustomerId ? { stripeCustomerId: user.stripeCustomerId } : {}),
        ...(user?.stripeDefaultPaymentMethodId ? { paymentMethodId: user.stripeDefaultPaymentMethodId } : {}),
      });
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId ?? '');
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
        ...(paymentIntentId ? { paymentIntentId } : {}),
        ...(promoCode ? { promoCode } : {}),
        items: items.map((i) => ({ productId: i.product.id, quantity: i.quantity, price: i.product.price })),
      });
    } catch (err: any) {
      console.error('Order creation failed after payment:', err);
      setError('Tu pago fue procesado pero no pudimos registrar tu pedido. Contacta soporte con el email de confirmación de Stripe.');
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

        {/* Address save suggestion for logged-in users with no saved address */}
        {user && !user.address && step === 1 && (
          <div className="flex items-start gap-3 bg-gold-50 border border-gold-200 p-3 mb-6">
            <MapPin className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <p className="text-coffee-700 text-xs leading-relaxed">
              Completa tu dirección aquí y{' '}
              <Link to="/perfil/datos" className="text-gold-600 hover:text-gold-700 underline">guárdala en tu perfil</Link>
              {' '}para que se autocomplete en futuros pedidos.
            </p>
          </div>
        )}

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
                    <div>
                      <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Nombre completo *</label>
                      <input
                        name="customerName" type="text" required
                        value={form.customerName} onChange={handleChange}
                        className={`w-full bg-white border text-coffee-900 px-4 py-3 text-sm focus:outline-none ${fieldErrors.customerName ? 'border-red-500 focus:border-red-500' : 'border-coffee-300 focus:border-gold-500'}`}
                        placeholder="Tu nombre"
                      />
                      {fieldErrors.customerName && <p className="text-red-400 text-xs mt-1">{fieldErrors.customerName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Email *</label>
                      <input
                        name="email" type="email" required
                        value={form.email} onChange={handleChange}
                        className="w-full bg-white border border-coffee-300 text-coffee-900 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                        placeholder="tu@email.com"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-coffee-600 uppercase tracking-widest mb-2">Teléfono</label>
                    <input name="phone" value={form.phone} onChange={handleChange}
                      className={`w-full bg-white border text-coffee-900 px-4 py-3 text-sm focus:outline-none ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-coffee-300 focus:border-gold-500'}`}
                      placeholder="55 1234 5678" />
                    {fieldErrors.phone && <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>}
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
                        className={`w-full bg-white border text-coffee-900 px-4 py-3 text-sm focus:outline-none ${fieldErrors.zipCode ? 'border-red-500 focus:border-red-500' : 'border-coffee-300 focus:border-gold-500'}`}
                        placeholder="12345" />
                      {fieldErrors.zipCode && <p className="text-red-400 text-xs mt-1">{fieldErrors.zipCode}</p>}
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
              {/* Promo code */}
              {step === 1 && (
                <div className="border-t border-coffee-200 pt-4 mb-4">
                  <p className="text-[10px] text-coffee-500 uppercase tracking-widest mb-2">Código de descuento</p>
                  {promoCode ? (
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700 text-xs font-medium">{promoCode}</span>
                        <span className="text-green-600 text-xs">− ${promoDiscount.toLocaleString('es-MX')}</span>
                      </div>
                      <button onClick={() => { setPromoCode(''); setPromoDiscount(0); setPromoInput(''); }}
                        className="text-coffee-400 hover:text-red-500 transition-colors">
                        <Check className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value.toUpperCase()); setPromoError(''); }}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleApplyPromo(); } }}
                        placeholder="CÓDIGO"
                        className="flex-1 bg-white border border-coffee-300 text-coffee-900 px-3 py-2 text-xs focus:border-gold-500 focus:outline-none uppercase"
                      />
                      <button onClick={handleApplyPromo} disabled={promoLoading || !promoInput.trim()}
                        className="bg-coffee-100 border border-coffee-300 text-coffee-700 px-3 py-2 text-xs hover:bg-coffee-200 transition-colors disabled:opacity-50 flex items-center gap-1">
                        {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Aplicar'}
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                </div>
              )}

              <div className="border-t border-coffee-200 pt-4">
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-coffee-600">Subtotal</span>
                    <span className="text-coffee-700">${total().toLocaleString('es-MX')}</span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-600">Descuento</span>
                    <span className="text-green-600">− ${promoDiscount.toLocaleString('es-MX')}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span className="text-coffee-900">Total</span>
                  <span className="text-gold-600 text-lg">${Math.max(total() - promoDiscount, 0).toLocaleString('es-MX')}</span>
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
