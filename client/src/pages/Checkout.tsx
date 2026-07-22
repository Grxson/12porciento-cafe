import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  ChevronRight,
  ChevronLeft,
  Tag,
  Loader2,
  MapPin,
  CreditCard,
  Package,
  ShoppingBag,
} from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { ordersApi, paymentsApi, promoCodesApi, usersApi, abandonedCartApi } from '../api';
import { retryWithBackoff } from '../services/paymentRetry';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';
import { useToast } from '../context/ToastContext';
import StripePaymentForm from '../components/StripePaymentForm';
import { mexicanStates } from '../constants/mexico';
import type { PaymentMethod } from '../types';
import { PageMeta } from '../hooks/usePageMeta';
import PushPermissionBanner from '../components/PushPermissionBanner';
import { getApiError, getErrorStatus } from '../lib/api-error';

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
  if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    errors.email = 'Email inválido';
  }
  if (!form.address.trim()) {
    errors.address = 'Dirección requerida';
  }
  if (!form.city.trim()) {
    errors.city = 'Ciudad requerida';
  }
  if (!form.state) {
    errors.state = 'Selecciona un estado';
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
  const { add: addToast } = useToast();
  // step 1 = shipping, 2 = payment method (card selection), 3 = confirm payment
  const [step, setStep] = useState<1 | 2 | 3>(1);
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

  // Offline detection
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  // Saved payment methods state
  const [savedMethods, setSavedMethods] = useState<PaymentMethod[]>([]);
  const [defaultMethodId, setDefaultMethodId] = useState<string | null>(null);
  const [selectedMethodId, setSelectedMethodId] = useState<string | 'new'>('new');
  const [loadingMethods, setLoadingMethods] = useState(false);
  const [confirmingSaved, setConfirmingSaved] = useState(false);

  // Offline event listeners
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Fetch saved payment methods when user has a Stripe customer ID
  useEffect(() => {
    if (!user?.stripeCustomerId) return;
    let cancelled = false;
    setLoadingMethods(true);
    usersApi
      .listPaymentMethods()
      .then((res) => {
        if (cancelled) return;
        const { methods, defaultId } = res.data;
        setSavedMethods(methods);
        setDefaultMethodId(defaultId);
        setSelectedMethodId(defaultId ?? (methods.length > 0 ? methods[0].id : 'new'));
      })
      .catch(() => {
        if (!cancelled) {
          setSavedMethods([]);
          setSelectedMethodId('new');
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMethods(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.stripeCustomerId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('success') === 'true' && !success) {
      setSuccess(true);
    }
  }, []);

  // Track abandoned cart on mount + page leave (for logged-in users with items)
  useEffect(() => {
    if (items.length === 0 || !user) return;

    const data = {
      items: items.map((i) => {
        if (i.itemType === 'product') {
          return {
            productId: i.product.id,
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
          };
        }
        return {
          productId: i.bundleId,
          name: i.bundle.name,
          quantity: i.quantity,
          price: i.bundle.finalPrice,
        };
      }),
      email: user.email,
      couponCode: promoCode || undefined,
    };

    // Track on mount (already at risk)
    abandonedCartApi.track(data).catch(() => {});

    // Track on page close/refresh via sendBeacon
    const token = localStorage.getItem('user_token');
    const handleBeforeUnload = () => {
      if (!token) return;
      navigator.sendBeacon(
        `${import.meta.env.VITE_API_URL || '/api'}/abandoned-cart/track`,
        new Blob([JSON.stringify(data)], { type: 'application/json' }),
      );
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
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
      // Any non-FIXED type is a percentage (matches server applyPromo + legacy 'PERCENT' rows)
      const discountAmt = type !== 'FIXED' ? sub * (discount / 100) : Math.min(discount, sub);
      setPromoCode(promoInput.trim().toUpperCase());
      setPromoDiscount(discountAmt);
    } catch (err: unknown) {
      setPromoError(getApiError(err, 'Código inválido'));
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
    setError('');

    // If the user has saved methods, show the card-selection step first
    if (user?.stripeCustomerId && savedMethods.length > 0) {
      setStep(2);
      return;
    }

    // Otherwise create intent immediately (new-card flow)
    await createIntentAndAdvance('new');
  };

  const createIntentAndAdvance = async (methodChoice: string | 'new') => {
    setLoadingIntent(true);
    setError('');
    try {
      const freshIdempotencyKey = crypto.randomUUID();
      const useSavedCard = methodChoice !== 'new' && user?.stripeCustomerId;
      const expandedItems = items.flatMap((i) =>
        i.itemType === 'product'
          ? [{ productId: i.product.id, quantity: i.quantity }]
          : i.bundle.items.map((bi) => ({
              productId: bi.product.id,
              quantity: bi.quantity * i.quantity,
            })),
      );
      const payload = {
        items: expandedItems,
        ...(promoCode ? { promoCode } : {}),
        ...(user?.stripeCustomerId ? { stripeCustomerId: user.stripeCustomerId } : {}),
        ...(useSavedCard ? { paymentMethodId: methodChoice } : {}),
        customerName: form.customerName,
        email: form.email,
        phone: form.phone,
        address: form.address,
        city: form.city,
        state: form.state,
        zipCode: form.zipCode,
        notes: form.notes,
        ...(user ? { userId: user.id } : {}),
      };
      const res = await retryWithBackoff(() =>
        paymentsApi.createIntent(payload, freshIdempotencyKey),
      );
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId ?? '');
      setIntentAmount(res.data.amount);
      setStep(3);
    } catch (err: unknown) {
      const msg = getApiError(err, 'Error al iniciar el pago. Intenta de nuevo.');
      setError(msg);
      if (getErrorStatus(err) === 400 && /stock|máximo|maximo/i.test(msg)) {
        addToast(msg, 'warning');
      }
    } finally {
      setLoadingIntent(false);
    }
  };

  const handleCardSelectionSubmit = async () => {
    await createIntentAndAdvance(selectedMethodId);
  };

  const handleConfirmSavedCard = async () => {
    setConfirmingSaved(true);
    setError('');
    try {
      const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');
      if (!stripe) throw new Error('Stripe no disponible');
      const result = await stripe.confirmPayment({
        clientSecret,
        confirmParams: {
          return_url: `${window.location.origin}/checkout?success=true`,
        },
        redirect: 'if_required',
      });
      if (result.error) {
        setError(result.error.message || 'Error al procesar el pago.');
      } else if (result.paymentIntent?.status === 'succeeded') {
        await handlePaymentSuccess();
      }
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al procesar el pago.'));
    } finally {
      setConfirmingSaved(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      const orderItems = items.flatMap((i) =>
        i.itemType === 'product'
          ? [{ productId: i.product.id, quantity: i.quantity }]
          : i.bundle.items.map((bi) => ({
              productId: bi.product.id,
              quantity: bi.quantity * i.quantity,
            })),
      );
      await retryWithBackoff(() =>
        ordersApi.create({
          ...form,
          ...(user ? { userId: user.id } : {}),
          ...(paymentIntentId ? { paymentIntentId } : {}),
          ...(promoCode ? { promoCode } : {}),
          items: orderItems,
        }),
      );
      setSuccess(true);
      clearCart();
    } catch (err: unknown) {
      console.error('Order creation failed after payment:', err);
      setSuccess(true);
      addToast(
        'Tu pago fue procesado pero no pudimos registrar tu pedido. Contacta soporte.',
        'error',
        8000,
      );
      clearCart();
    }
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
  };

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center gap-6 px-4 bg-coffee-50 dark:bg-coffee-950">
        <PageMeta
          title="Pago"
          description="Finaliza tu compra de café de especialidad de forma segura."
        />
        <div className="w-24 h-24 border border-coffee-200 dark:border-coffee-800 flex items-center justify-center">
          <ShoppingBag className="w-10 h-10 text-coffee-700 dark:text-coffee-300" />
        </div>
        <div className="text-center">
          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-2">
            Carrito vacío
          </h2>
          <p className="text-coffee-500 max-w-xs leading-relaxed text-sm">
            Agrega productos a tu carrito antes de proceder al pago.
          </p>
        </div>
        <Link to="/tienda" className="btn-primary">
          Ir a la tienda
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen pt-20 flex flex-col items-center justify-center px-4 bg-coffee-50 dark:bg-coffee-950">
        <PageMeta
          title="Pago"
          description="Finaliza tu compra de café de especialidad de forma segura."
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-coffee-100 dark:bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-3">
            ¡Pedido confirmado!
          </h2>
          <p className="text-coffee-700 dark:text-coffee-300 leading-relaxed mb-8">
            Tu pago fue procesado exitosamente. Tostamos a pedido para garantizar frescura máxima —
            recibirás tu café dentro de los próximos 3-5 días hábiles.
          </p>
          {!user && (
            <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-5 mb-6 text-left">
              <p className="text-coffee-900 dark:text-cream text-sm font-medium mb-1">
                ¿Quieres rastrear este pedido?
              </p>
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mb-3">
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
          <Link to="/tienda" className="btn-primary block">
            Seguir comprando
          </Link>
        </motion.div>
        <div className="max-w-md w-full mt-4">
          <PushPermissionBanner />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950">
      <PageMeta
        title="Pago"
        description="Finaliza tu compra de café de especialidad de forma segura."
      />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-12">
        <div className="gold-line mb-4" />
        <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-4">Checkout</h1>

        {/* Offline banner */}
        {isOffline && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-300 px-4 py-3 text-sm mb-4 rounded">
            Sin conexión — no puedes completar el pago sin internet.
          </div>
        )}

        {/* Address save suggestion for logged-in users with no saved address */}
        {user && !user.address && step === 1 && !form.address && (
          <div className="flex items-start gap-3 bg-gold-50 dark:bg-gold-500/5 border border-gold-200 dark:border-gold-500/20 p-3 mb-6">
            <MapPin className="w-4 h-4 text-gold-600 shrink-0 mt-0.5" />
            <p className="text-coffee-700 dark:text-coffee-300 text-xs leading-relaxed">
              Completa tu dirección aquí y{' '}
              <Link
                to="/perfil/datos"
                className="text-gold-600 dark:text-gold-400 hover:text-gold-700 underline"
              >
                guárdala en tu perfil
              </Link>{' '}
              para que se autocomplete en futuros pedidos.
            </p>
          </div>
        )}

        {/* Step indicator */}
        <div className="mb-8 sm:hidden" aria-current="step">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold uppercase tracking-wider text-gold-600">
              Paso {step} de 3
            </span>
            <span className="text-coffee-500">
              {step === 1 ? 'Datos de envío' : step === 2 ? 'Método de pago' : 'Confirmar'}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-coffee-200 dark:bg-coffee-800">
            <div
              className="h-full bg-gold-500 transition-all"
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>
        <div
          className="mb-10 hidden items-center gap-3 sm:flex"
          role="progressbar"
          aria-valuenow={step === 1 ? 0 : step === 2 ? 50 : 100}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progreso del pedido"
        >
          {[
            { n: 1, label: 'Datos de envío' },
            { n: 2, label: 'Método de pago' },
            { n: 3, label: 'Confirmar' },
          ].map(({ n, label }, i, arr) => {
            const stepNum = step;
            const isActive = stepNum === n;
            const isPast = stepNum > n;
            return (
              <div
                key={n}
                className="flex items-center gap-2"
                aria-current={isActive ? 'step' : undefined}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    stepNum >= n
                      ? 'bg-gold-500 text-coffee-950'
                      : 'bg-coffee-200 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400'
                  }`}
                >
                  {isPast ? <Check className="w-3.5 h-3.5" /> : n}
                </div>
                <span
                  className={`text-sm transition-colors ${isActive ? 'text-coffee-900 dark:text-cream font-medium' : 'text-coffee-600 dark:text-coffee-400'}`}
                >
                  {label}
                </span>
                {i < arr.length - 1 && (
                  <ChevronRight className="w-4 h-4 text-coffee-400 dark:text-coffee-700 ml-1" />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <AnimatePresence>
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
                  <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">
                    Datos de envío
                  </h2>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="checkout-customername"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                      >
                        Nombre completo *
                      </label>
                      <input
                        id="checkout-customername"
                        name="customerName"
                        type="text"
                        required
                        autoComplete="name"
                        value={form.customerName}
                        onChange={handleChange}
                        className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.customerName ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                        placeholder="Tu nombre"
                      />
                      {fieldErrors.customerName && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.customerName}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-email"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                      >
                        Email *
                      </label>
                      <input
                        id="checkout-email"
                        name="email"
                        type="email"
                        required
                        autoComplete="email"
                        value={form.email}
                        onChange={(e) => {
                          handleChange(e);
                          if (fieldErrors.email)
                            setFieldErrors((p) => ({ ...p, email: undefined }));
                        }}
                        className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.email ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                        placeholder="tu@email.com"
                      />
                      {fieldErrors.email && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-phone"
                      className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                    >
                      Teléfono
                    </label>
                    <input
                      id="checkout-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={form.phone}
                      onChange={handleChange}
                      className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.phone ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                      placeholder="55 1234 5678"
                    />
                    {fieldErrors.phone && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.phone}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-address"
                      className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                    >
                      Dirección *
                    </label>
                    <input
                      id="checkout-address"
                      name="address"
                      autoComplete="street-address"
                      required
                      value={form.address}
                      onChange={(e) => {
                        handleChange(e);
                        if (fieldErrors.address)
                          setFieldErrors((p) => ({ ...p, address: undefined }));
                      }}
                      className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.address ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                      placeholder="Calle, número, colonia"
                    />
                    {fieldErrors.address && (
                      <p className="text-red-400 text-xs mt-1">{fieldErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="checkout-city"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                      >
                        Ciudad *
                      </label>
                      <input
                        id="checkout-city"
                        name="city"
                        autoComplete="address-level2"
                        required
                        value={form.city}
                        onChange={(e) => {
                          handleChange(e);
                          if (fieldErrors.city) setFieldErrors((p) => ({ ...p, city: undefined }));
                        }}
                        className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.city ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                        placeholder="Ciudad"
                      />
                      {fieldErrors.city && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.city}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-state"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                      >
                        Estado *
                      </label>
                      <select
                        id="checkout-state"
                        name="state"
                        autoComplete="address-level1"
                        required
                        value={form.state}
                        onChange={(e) => {
                          handleChange(e);
                          if (fieldErrors.state)
                            setFieldErrors((p) => ({ ...p, state: undefined }));
                        }}
                        className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.state ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                      >
                        <option value="">Seleccionar</option>
                        {mexicanStates.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      {fieldErrors.state && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.state}</p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="checkout-zipcode"
                        className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                      >
                        CP *
                      </label>
                      <input
                        id="checkout-zipcode"
                        name="zipCode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        pattern="[0-9]{5}"
                        required
                        value={form.zipCode}
                        onChange={handleChange}
                        className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:outline-none ${fieldErrors.zipCode ? 'border-red-500 focus:border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500'}`}
                        placeholder="12345"
                      />
                      {fieldErrors.zipCode && (
                        <p className="text-red-400 text-xs mt-1">{fieldErrors.zipCode}</p>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="checkout-notes"
                      className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
                    >
                      Notas adicionales
                    </label>
                    <textarea
                      id="checkout-notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-base focus:border-gold-500 focus:outline-none resize-none"
                      placeholder="Instrucciones especiales..."
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={loadingIntent || isOffline}
                    className="btn-primary w-full min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingIntent ? (
                      'Iniciando pago...'
                    ) : (
                      <>
                        <span>Continuar al pago</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.form>
              )}

              {step === 2 && (
                <motion.div
                  key="step-payment-method"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => {
                        setStep(1);
                        setError('');
                      }}
                      className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream transition-colors text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" /> Volver a envío
                    </button>
                  </div>
                  <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-6">
                    Método de pago
                  </h2>

                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                  <div className="space-y-3 mb-6">
                    {loadingMethods ? (
                      <div className="flex items-center gap-2 text-coffee-600 dark:text-coffee-400 text-sm py-4">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Cargando métodos de pago...
                      </div>
                    ) : (
                      <>
                        {savedMethods.map((m) => (
                          <label
                            key={m.id}
                            className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                              selectedMethodId === m.id
                                ? 'border-gold-500 bg-gold-50 dark:bg-gold-500/10'
                                : 'border-coffee-200 dark:border-coffee-700 bg-white dark:bg-coffee-800 hover:border-coffee-400 dark:hover:border-coffee-600'
                            }`}
                          >
                            <input
                              type="radio"
                              name="paymentMethod"
                              value={m.id}
                              checked={selectedMethodId === m.id}
                              onChange={() => setSelectedMethodId(m.id)}
                              className="accent-gold-500"
                            />
                            <CreditCard
                              className={`w-5 h-5 shrink-0 ${selectedMethodId === m.id ? 'text-gold-600' : 'text-coffee-600 dark:text-coffee-400'}`}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-coffee-900 dark:text-cream text-sm font-medium capitalize">
                                {m.brand} •••• {m.last4}
                                {m.id === defaultMethodId && (
                                  <span className="ml-2 text-xs text-gold-600 uppercase tracking-widest border border-gold-400 px-1.5 py-0.5">
                                    predeterminada
                                  </span>
                                )}
                              </p>
                              <p className="text-coffee-500 text-xs">
                                Vence {String(m.expMonth).padStart(2, '0')}/{m.expYear}
                              </p>
                            </div>
                          </label>
                        ))}

                        <label
                          className={`flex items-center gap-4 p-4 border cursor-pointer transition-colors ${
                            selectedMethodId === 'new'
                              ? 'border-gold-500 bg-gold-50 dark:bg-gold-500/10'
                              : 'border-coffee-200 dark:border-coffee-700 bg-white dark:bg-coffee-800 hover:border-coffee-400 dark:hover:border-coffee-600'
                          }`}
                        >
                          <input
                            type="radio"
                            name="paymentMethod"
                            value="new"
                            checked={selectedMethodId === 'new'}
                            onChange={() => setSelectedMethodId('new')}
                            className="accent-gold-500"
                          />
                          <CreditCard
                            className={`w-5 h-5 shrink-0 ${selectedMethodId === 'new' ? 'text-gold-600' : 'text-coffee-600 dark:text-coffee-400'}`}
                          />
                          <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                            Usar tarjeta nueva
                          </p>
                        </label>
                      </>
                    )}
                  </div>

                  <button
                    onClick={handleCardSelectionSubmit}
                    disabled={loadingIntent || loadingMethods || isOffline}
                    className="btn-primary w-full min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loadingIntent ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Iniciando pago...
                      </>
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-6">
                    <button
                      onClick={() => {
                        setClientSecret('');
                        setPaymentIntentId('');
                        setError('');
                        setStep(savedMethods.length > 0 && !!user?.stripeCustomerId ? 2 : 1);
                      }}
                      className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream transition-colors text-sm"
                    >
                      <ChevronLeft className="w-4 h-4" /> Volver
                    </button>
                  </div>
                  <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-6">
                    Pago seguro
                  </h2>

                  {error && <p className="text-red-400 text-sm mb-4">{error}</p>}

                  {selectedMethodId !== 'new' &&
                  savedMethods.some((m) => m.id === selectedMethodId) ? (
                    (() => {
                      const savedCard = savedMethods.find((m) => m.id === selectedMethodId)!;
                      return (
                        <div className="space-y-6">
                          <div className="flex items-center gap-4 p-4 border border-gold-400 bg-gold-50 dark:bg-gold-500/10">
                            <CreditCard className="w-6 h-6 text-gold-600 shrink-0" />
                            <div>
                              <p className="text-coffee-900 dark:text-cream text-sm font-medium capitalize">
                                {savedCard.brand} •••• {savedCard.last4}
                              </p>
                              <p className="text-coffee-500 text-xs">
                                Vence {String(savedCard.expMonth).padStart(2, '0')}/
                                {savedCard.expYear}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={handleConfirmSavedCard}
                            disabled={confirmingSaved || isOffline}
                            className="btn-primary w-full min-h-[52px] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                            {confirmingSaved ? (
                              <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                              </>
                            ) : (
                              `Pagar $${intentAmount.toLocaleString('es-MX')} MXN`
                            )}
                          </button>
                        </div>
                      );
                    })()
                  ) : (
                    <StripePaymentForm
                      clientSecret={clientSecret}
                      amount={intentAmount}
                      onSuccess={handlePaymentSuccess}
                      onError={handlePaymentError}
                    />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Order summary */}
          <div>
            <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-6 sticky top-24">
              <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-5">Tu pedido</h3>
              <div className="space-y-3 mb-5">
                {items.map((item) =>
                  item.itemType === 'product' ? (
                    <div key={`prod_${item.product.id}`} className="flex gap-3">
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-12 h-12 object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-coffee-900 dark:text-cream text-sm leading-tight truncate">
                          {item.product?.name ?? 'Producto'}
                        </p>
                        <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                          {item.product.weight}g · x{item.quantity}
                        </p>
                      </div>
                      <p className="text-coffee-800 dark:text-coffee-300 text-sm shrink-0">
                        ${(Number(item.product.price) * item.quantity).toLocaleString('es-MX')}
                      </p>
                    </div>
                  ) : (
                    <div key={`bund_${item.bundleId}`} className="flex gap-3">
                      {item.bundle.imageUrl ? (
                        <img
                          src={item.bundle.imageUrl}
                          alt={item.bundle.name}
                          className="w-12 h-12 object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gold-50 dark:bg-gold-500/10 flex items-center justify-center shrink-0">
                          <Package className="w-5 h-5 text-gold-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-coffee-900 dark:text-cream text-sm leading-tight truncate">
                          {item.bundle?.name ?? 'Paquete'}
                        </p>
                        <p className="text-coffee-500 dark:text-coffee-400 text-xs">
                          {item.bundle.items.length} producto
                          {item.bundle.items.length !== 1 ? 's' : ''}
                          {item.bundle.discountPct > 0 && ` · ${item.bundle.discountPct}% OFF`}
                        </p>
                      </div>
                      <p className="text-coffee-800 dark:text-coffee-300 text-sm shrink-0">
                        $
                        {(Number(item.bundle?.finalPrice ?? 0) * item.quantity).toLocaleString(
                          'es-MX',
                        )}
                      </p>
                    </div>
                  ),
                )}
              </div>
              {/* Promo code */}
              {step === 1 && (
                <div className="border-t border-coffee-200 dark:border-coffee-700 pt-4 mb-4">
                  <p className="text-xs text-coffee-500 dark:text-coffee-400 uppercase tracking-widest mb-2">
                    Código de descuento
                  </p>
                  {promoCode ? (
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-500/30 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <Tag className="w-3.5 h-3.5 text-green-600" />
                        <span className="text-green-700 dark:text-green-400 text-xs font-medium">
                          {promoCode}
                        </span>
                        <span className="text-green-600 dark:text-green-400 text-xs">
                          − ${promoDiscount.toLocaleString('es-MX')}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          setPromoCode('');
                          setPromoDiscount(0);
                          setPromoInput('');
                        }}
                        className="text-coffee-600 dark:text-coffee-400 hover:text-red-500 transition-colors"
                      >
                        <Check className="w-3 h-3 rotate-45" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2 w-full min-w-0">
                      <input
                        value={promoInput}
                        onChange={(e) => {
                          setPromoInput(e.target.value.toUpperCase());
                          setPromoError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyPromo();
                          }
                        }}
                        placeholder="CÓDIGO"
                        className="flex-1 min-w-0 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-3 text-base min-h-[44px] focus:border-gold-500 focus:outline-none uppercase"
                      />
                      <button
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoInput.trim()}
                        className="shrink-0 bg-coffee-100 dark:bg-coffee-700 border border-coffee-200 dark:border-coffee-700 text-coffee-800 dark:text-coffee-300 px-3 text-sm min-h-[44px] hover:bg-coffee-200 dark:hover:bg-coffee-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-1 whitespace-nowrap"
                      >
                        {promoLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Aplicar'}
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-red-400 text-xs mt-1">{promoError}</p>}
                </div>
              )}

              <div className="border-t border-coffee-200 dark:border-coffee-700 pt-4">
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-coffee-600 dark:text-coffee-400">Subtotal</span>
                    <span className="text-coffee-800 dark:text-coffee-300">
                      ${total().toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                {promoDiscount > 0 && (
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-green-600">Descuento</span>
                    <span className="text-green-600">
                      − ${promoDiscount.toLocaleString('es-MX')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span className="text-coffee-900 dark:text-cream">Total</span>
                  <span className="text-gold-600 text-lg">
                    ${Math.max(total() - promoDiscount, 0).toLocaleString('es-MX')}
                  </span>
                </div>
                <p className="text-coffee-500 dark:text-coffee-400 text-xs mt-1">
                  + envío según destino
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
