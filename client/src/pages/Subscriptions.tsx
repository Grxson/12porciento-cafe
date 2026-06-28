import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Truck, RefreshCw, ChevronRight, ChevronLeft, Coffee, AlertTriangle, MapPin, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { CardElement, useStripe, useElements, Elements } from '@stripe/react-stripe-js';
import { subscriptionsApi, usersApi } from '../api';
import { useUser } from '../context/UserContext';
import ScrollReveal from '../components/ScrollReveal';
import CoffeePicker from '../components/CoffeePicker';
import type { SubscriptionPlan } from '../types';
import { PLAN_SLOTS } from '../types';
import { PageMeta } from '../hooks/usePageMeta';
import { useToast } from '../context/ToastContext';
import { mexicanStates } from '../constants/mexico';

const plans: Array<{
  id: SubscriptionPlan;
  name: string;
  price: number | null;
  subtitle: string;
  description: string;
  features: string[];
  excluded: string[];
  featured: boolean;
  badge?: string;
}> = [
  {
    id: 'FUNDADOR', name: 'Fundador', price: 350,
    subtitle: '2 lotes × 250g / mes',
    description: 'Para quien empieza su camino en el café de especialidad.',
    features: ['2 cafés de especialidad a elegir', 'Grano entero o molido', 'Notas de catación incluidas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Ediciones limitadas', 'Microlotes exclusivos'],
    featured: false,
    badge: 'Para empezar',
  },
  {
    id: 'EXPLORADOR', name: 'Explorador', price: 650,
    subtitle: '2-3 lotes × 250g / mes',
    description: 'Descubre diferentes orígenes y procesos cada mes.',
    features: ['2 a 3 cafés a elegir', 'Acceso a microlotes', 'Grano entero o molido', 'Notas de catación detalladas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Experimentales anaeróbicos'],
    featured: true,
    badge: 'Más popular',
  },
  {
    id: 'CONNOISSEUR', name: 'Connoisseur', price: 890,
    subtitle: '3 lotes premium / mes',
    description: 'Los lotes más exclusivos y complejos del catálogo.',
    features: ['3 cafés premium a elegir', 'Acceso a ediciones limitadas', 'Cafés experimentales y anaeróbicos', 'Prioridad en microlotes', 'Notas de catación extendidas', 'Envío exprés incluido'],
    excluded: [],
    featured: false,
    badge: 'Acceso anticipado · 48h',
  },
  {
    id: 'EMPRESARIAL', name: 'Empresarial', price: null,
    subtitle: 'Mínimo 10 lotes / mes',
    description: 'Para oficinas y negocios que quieren ofrecer especialidad.',
    features: ['Mínimo 10 lotes a elegir', 'Todo el catálogo disponible', '15% descuento por volumen', 'Gestor de cuenta dedicado', 'Facturación mensual', 'Envío exprés'],
    excluded: [],
    featured: false,
    badge: 'Personalizado',
  },
];

type Step = 1 | 2 | 3 | 4;
interface FormData { name: string; email: string; phone: string; frequency: string; address: string; city: string; state: string; zipCode: string; }
interface B2BFormData {
  empresa: string;
  rfc: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  volumenEstimado: '10-25' | '26-50' | '50+';
  giroNegocio?: string;
}

export default function Subscriptions() {
  const user = useUser((s) => s.user);
  const hasSubscription = useUser((s) => s.hasSubscription);
  const { add: addToast } = useToast();
  const [step, setStep] = useState<Step>(1);
  const [currentPlan, setCurrentPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [selectedCoffees, setSelectedCoffees] = useState<string[]>([]);
  const [grindPreference, setGrindPreference] = useState<'MOLIDO' | 'GRANO'>('GRANO');
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    frequency: 'monthly',
    address: user?.address ?? '',
    city: user?.city ?? '',
    state: user?.state ?? '',
    zipCode: user?.zipCode ?? '',
  });
  const [setupClientSecret, setSetupClientSecret] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentError, setPaymentError] = useState('');
  const [b2bForm, setB2BForm] = useState<B2BFormData>({
    empresa: '',
    rfc: '',
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
    volumenEstimado: '10-25',
    giroNegocio: '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showB2BConfirm, setShowB2BConfirm] = useState(false);
  const [error, setError] = useState('');
  const [isUpgrade, setIsUpgrade] = useState(false);

  const hasAddress = !!(user?.address && user?.city && user?.state && user?.zipCode);

  useEffect(() => {
    if (hasSubscription) {
      usersApi.mySubscription()
        .then((r) => setCurrentPlan((r.data?.plan as SubscriptionPlan) ?? null))
        .catch(() => setCurrentPlan(null));
    } else {
      setCurrentPlan(null);
    }
  }, [hasSubscription]);

  const goToStep = (n: Step) => {
    setStep(n);
    if (n === 1) { setIsUpgrade(false); setError(''); }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlan = (plan: typeof plans[0]) => {
    if (currentPlan === plan.id) return; // Already on this plan
    setSelectedPlan(plan);
    setSelectedCoffees([]);
    goToStep(2);
  };

  const handleCoffeeNext = async () => {
    if (!selectedPlan) return;
    const slots = PLAN_SLOTS[selectedPlan.id];
    if (selectedCoffees.length < slots.min) return;
    if (hasSubscription && user && selectedPlan.id !== 'EMPRESARIAL') {
      // Upgrade: submit directly, skip contact/payment forms
      setLoading(true); setError(''); setIsUpgrade(true);
      try {
        await subscriptionsApi.create({
          name: user.name ?? form.name,
          email: user.email ?? form.email,
          phone: user.phone ?? form.phone,
          plan: selectedPlan.id,
          frequency: form.frequency,
          grindPreference,
          items: selectedCoffees,
          userId: user.id,
        });
        useUser.getState().setHasSubscription(true);
        setCurrentPlan(selectedPlan.id);
        setSuccess(true);
      } catch (err: any) {
        setError(err.response?.data?.error || 'Error al actualizar plan.');
      } finally {
        setLoading(false);
      }
    } else {
      goToStep(3);
    }
  };

  const handleSetupIntent = async () => {
    try {
      const res = await subscriptionsApi.createSetupIntent();
      setSetupClientSecret(res.data.clientSecret);
      goToStep(4);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar configuración de pago.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (user && !hasAddress) {
      setError('Necesitas agregar tu dirección de envío antes de suscribirte.');
      return;
    }

    setLoading(true); setError(''); setIsUpgrade(false);
    try {
      await subscriptionsApi.create({
        ...form,
        plan: selectedPlan.id,
        grindPreference,
        items: selectedCoffees,
        ...(user ? { userId: user.id } : {}),
      });
      useUser.getState().setHasSubscription(true);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar suscripción. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleB2BSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan || selectedPlan.id !== 'EMPRESARIAL') return;

    setLoading(true); setError('');
    try {
      await subscriptionsApi.b2bInquiry({
        empresa: b2bForm.empresa,
        rfc: b2bForm.rfc,
        contacto: b2bForm.contactoNombre,
        telefono: b2bForm.contactoTelefono,
        comentarios: `${b2bForm.volumenEstimado} kg/mes${b2bForm.giroNegocio ? ` · ${b2bForm.giroNegocio}` : ''}`,
      });
      setShowB2BConfirm(true);
    } catch (err: any) {
      addToast(err.message || 'Error al procesar consulta. Intenta de nuevo.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Elige tu plan', 'Tus cafés', 'Tus datos', 'Método de pago'];
  const stepShortLabels = ['Plan', 'Cafés', 'Datos', 'Pago'];

  if (success) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 flex items-center justify-center px-4">
        <PageMeta title="Suscripciones" description="Recibe café de especialidad cada mes. Personaliza tu dosis y frecuencia." />
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white dark:bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-3">
            {isUpgrade ? '¡Plan actualizado!' : '¡Suscripción confirmada!'}
          </h2>
          {isUpgrade ? (
            <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed mb-4">
              Cambiaste al plan <span className="text-gold-400 font-medium">{selectedPlan?.name}</span>.
              Tu próxima suscripción incluirá {selectedCoffees.length} lote{selectedCoffees.length !== 1 ? 's' : ''} tostados a pedido.
            </p>
          ) : (
            <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed mb-4">
              Bienvenido al plan <span className="text-gold-400 font-medium">{selectedPlan?.name}</span>.
              Tu primer envío incluirá {selectedCoffees.length} lote{selectedCoffees.length !== 1 ? 's' : ''} tostados a pedido.
            </p>
          )}
          <p className="text-coffee-500 dark:text-coffee-500 text-xs">
            {isUpgrade ? 'Tu suscripción se actualizó correctamente.' : 'Nos pondremos en contacto para coordinar el pago del primer ciclo.'}
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-coffee-50 dark:bg-coffee-950 pt-20 min-h-screen">
      <PageMeta title="Suscripciones" description="Recibe café de especialidad cada mes. Personaliza tu dosis y frecuencia." />
      {/* Hero */}
      <div className="bg-coffee-100 dark:bg-coffee-900 border-b border-coffee-200 dark:border-coffee-800 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="font-serif text-4xl sm:text-5xl md:text-6xl text-coffee-900 dark:text-cream mb-3">Suscripciones</h1>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm leading-relaxed max-w-lg mx-auto">
              Selecciona tus cafés favoritos. Tostamos a pedido, enviamos frescos cada mes.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 mt-6 text-coffee-500 text-xs">
              <div className="flex items-center gap-2"><Truck className="w-3.5 h-3.5 text-gold-500" />Envío incluido</div>
              <div className="flex items-center gap-2"><RefreshCw className="w-3.5 h-3.5 text-gold-500" />Cancela cuando quieras</div>
              <div className="flex items-center gap-2"><Star className="w-3.5 h-3.5 text-gold-500" />SCA ≥ 84 pts</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Step indicator */}
      <div className="max-w-xl mx-auto px-4 pt-10 pb-4">
        <div className="flex items-center">
          {stepLabels.map((label, i) => {
            const n = (i + 1) as Step;
            return (
              <div key={n} className="flex items-center flex-1">
                <div className="flex items-center gap-2 shrink-0">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step > n ? 'bg-gold-500 text-coffee-950' :
                    step === n ? 'bg-gold-500/20 border border-gold-500 text-gold-400' :
                    'bg-coffee-200 dark:bg-coffee-800 text-coffee-500 dark:text-coffee-600'
                  }`}>
                    {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <span className={`hidden sm:inline text-xs transition-colors ${step === n ? 'text-coffee-900 dark:text-cream' : 'text-coffee-500 dark:text-coffee-600'}`}>{label}</span>
                  <span className={`sm:hidden text-[11px] leading-tight transition-colors ${step === n ? 'text-coffee-900 dark:text-cream' : 'text-coffee-500 dark:text-coffee-600'}`}>{stepShortLabels[i]}</span>
                </div>
                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-coffee-200 dark:bg-coffee-800 mx-3" />}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {/* Step 1: Plan selection */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              {hasSubscription && (
                <div className="flex items-center justify-between bg-gold-500/10 border border-gold-500/30 px-5 py-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-gold-500 shrink-0" />
                    <div>
                      <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                        {currentPlan
                          ? `Plan ${plans.find((p) => p.id === currentPlan)?.name ?? currentPlan} — suscripción activa`
                          : 'Ya tienes una suscripción activa'}
                      </p>
                      <p className="text-coffee-400 text-xs">Selecciona un plan diferente para hacer el cambio o mejora al siguiente nivel.</p>
                    </div>
                  </div>
                  <Link to="/perfil/suscripcion" className="text-xs text-gold-500 hover:text-gold-400 border border-gold-500/30 px-3 py-1.5 transition-colors whitespace-nowrap">
                    Ver mi plan
                  </Link>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {plans.map((plan, i) => (
                  <motion.div
                    key={plan.id}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    onClick={() => handleSelectPlan(plan)}
                    className={`relative flex flex-col border transition-all duration-300 group
                      ${currentPlan === plan.id
                        ? 'opacity-70 cursor-default border-coffee-300 dark:border-coffee-600 bg-coffee-50 dark:bg-coffee-900/40'
                        : plan.featured
                          ? 'cursor-pointer border-gold-500 bg-white dark:bg-coffee-900 shadow-[0_0_40px rgba(201,169,110,0.1)]'
                          : 'cursor-pointer border-coffee-200 dark:border-coffee-800 bg-white dark:bg-coffee-900/60 hover:border-coffee-300 dark:hover:border-coffee-700'
                      }`}
                  >
                    <div className="p-6 flex-1">
                      {currentPlan === plan.id ? (
                        <span className="block -mt-7 mb-3 text-xs font-bold uppercase tracking-widest px-3 py-1 bg-coffee-300 dark:bg-coffee-600 text-coffee-700 dark:text-cream w-fit">Plan actual</span>
                      ) : plan.badge && (
                        <span className={`block -mt-7 mb-3 ${plan.featured ? 'text-xs font-extrabold' : 'text-xs font-bold'} uppercase tracking-widest px-3 py-1 bg-gold-500 text-coffee-950 w-fit`}>{plan.badge}</span>
                      )}
                      <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-1">{plan.name}</h3>
                      <p className="text-coffee-500 text-xs tracking-widest uppercase mb-4">{plan.subtitle}</p>
                      {plan.price ? (
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="font-serif text-3xl text-coffee-900 dark:text-cream">${plan.price}</span>
                          <span className="text-coffee-500 text-xs">/ mes</span>
                        </div>
                      ) : (
                        <p className="font-serif text-lg text-gold-500 mb-4">A precio de lote</p>
                      )}
                      <p className="text-coffee-600 dark:text-coffee-400 text-xs leading-relaxed mb-5">{plan.description}</p>
                      <div className="border-t border-coffee-200 dark:border-coffee-800 mb-5" />
                      <ul className="space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-700 dark:text-coffee-300">
                            <Check className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                        {plan.excluded.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-400 dark:text-coffee-600">
                            <X className="w-3.5 h-3.5 text-coffee-400 dark:text-coffee-700 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-6 pt-0">
                      {currentPlan === plan.id ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-3 text-xs font-semibold tracking-wider uppercase bg-coffee-100 dark:bg-coffee-800 text-coffee-400 dark:text-coffee-600 cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          Plan actual
                        </button>
                      ) : (
                        <button
                          type="button"
                          className={`w-full py-3 text-xs font-semibold tracking-wider uppercase transition-all flex items-center justify-center gap-2
                            ${plan.featured
                              ? 'bg-gold-500 text-coffee-950 group-hover:bg-gold-400'
                              : 'bg-coffee-100 dark:bg-coffee-800 text-coffee-700 dark:text-coffee-300 border border-coffee-200 dark:border-coffee-700 group-hover:border-gold-500/40 group-hover:text-coffee-900 dark:group-hover:text-cream'
                            }`}
                        >
                          {hasSubscription ? `Cambiar a ${plan.name}` : `Elegir ${plan.name}`} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 2: Coffee picker */}
        {step === 2 && selectedPlan && (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <button onClick={() => goToStep(1)} className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar plan
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="gold-line" />
                <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream">Plan {selectedPlan.name}</h2>
              </div>
              {/* Sticky continue bar when enough coffees selected */}
              {selectedCoffees.length >= PLAN_SLOTS[selectedPlan.id].min && (
                <div className="sticky top-20 z-10 bg-coffee-50 dark:bg-coffee-950 border border-gold-500/30 px-5 py-3 mb-6 flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium">
                      {selectedCoffees.length} café{selectedCoffees.length !== 1 ? 's' : ''} seleccionados
                    </p>
                    <p className="text-coffee-500 text-xs">{grindPreference === 'GRANO' ? 'Grano entero' : 'Molido'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCoffeeNext}
                    disabled={loading}
                    className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'Cambiando plan…' : 'Continuar'} <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              <CoffeePicker
                plan={selectedPlan.id}
                selected={selectedCoffees}
                onChange={setSelectedCoffees}
                grindPreference={grindPreference}
                onGrindChange={setGrindPreference}
              />
              <div className="mt-10 flex justify-end">
                <button
                  type="button"
                  disabled={selectedCoffees.length < PLAN_SLOTS[selectedPlan.id].min || loading}
                  onClick={handleCoffeeNext}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {loading ? 'Cambiando plan…' : 'Continuar'} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm mt-6">
                  <span>{error}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact form or B2B inquiry */}
        {step === 3 && selectedPlan && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
              {selectedPlan.id === 'EMPRESARIAL' ? (
                <>
                  <button onClick={() => goToStep(1)} className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream text-xs mb-8 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" /> Cambiar plan
                  </button>
                  <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Tu plan</span>
                      <span className="text-gold-400 text-sm font-medium">{selectedPlan.name}</span>
                    </div>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs leading-relaxed">
                      {selectedPlan.subtitle} • 15% descuento por volumen
                    </p>
                  </div>

                  {/* B2B Consultation Form */}
                  <form onSubmit={handleB2BSubmit} className="space-y-5">
                    <div className="gold-line mb-5" />
                    <h3 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Solicitud de asesoría</h3>

                    {[
                      { name: 'empresa', label: 'Empresa *', type: 'text', required: true, placeholder: 'Nombre de tu empresa' },
                      { name: 'rfc', label: 'RFC *', type: 'text', required: true, placeholder: 'RFC de tu empresa' },
                      { name: 'contactoNombre', label: 'Nombre del contacto *', type: 'text', required: true, placeholder: 'Tu nombre completo' },
                      { name: 'contactoEmail', label: 'Email corporativo *', type: 'email', required: true, placeholder: 'contacto@empresa.com' },
                      { name: 'contactoTelefono', label: 'Teléfono *', type: 'tel', required: true, placeholder: '55 1234 5678' },
                    ].map(({ name, label, type, required, placeholder }) => (
                      <div key={name}>
                        <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">{label}</label>
                        <input
                          type={type} required={required} placeholder={placeholder}
                          value={(b2bForm as any)[name]}
                          onChange={(e) => setB2BForm((f) => ({ ...f, [name]: e.target.value }))}
                          className="input-dark !text-base min-h-[48px]"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">Volumen estimado *</label>
                      <select
                        required
                        value={b2bForm.volumenEstimado}
                        onChange={(e) => setB2BForm((f) => ({ ...f, volumenEstimado: e.target.value as any }))}
                        className="input-dark !text-base min-h-[48px]"
                      >
                        <option value="10-25">10-25 lotes/mes</option>
                        <option value="26-50">26-50 lotes/mes</option>
                        <option value="50+">50+ lotes/mes</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">Giro del negocio</label>
                      <input
                        type="text" placeholder="Ej: Oficina, Café, Restaurante, etc."
                        value={b2bForm.giroNegocio || ''}
                        onChange={(e) => setB2BForm((f) => ({ ...f, giroNegocio: e.target.value }))}
                        className="input-dark !text-base min-h-[48px]"
                      />
                    </div>

                    {error && (
                      <div className="text-red-400 text-sm">
                        <span>{error}</span>
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                    <p className="text-coffee-500 dark:text-coffee-600 text-xs text-center">
                      Te contactaremos en 24h para diseñar tu plan personalizado.
                    </p>
                  </form>
                </>
              ) : (
                <>
                  <button onClick={() => goToStep(2)} className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream text-xs mb-8 transition-colors">
                    <ChevronLeft className="w-3.5 h-3.5" /> Cambiar cafés
                  </button>
                  <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 mb-8">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-coffee-500 uppercase tracking-widest">Tu suscripción</span>
                      <span className="text-gold-400 text-sm font-medium">{selectedPlan.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-coffee-600 dark:text-coffee-400 mb-3">
                      <Coffee className="w-3.5 h-3.5 text-gold-500" />
                      {selectedCoffees.length} café{selectedCoffees.length !== 1 ? 's' : ''} seleccionados · {grindPreference === 'GRANO' ? 'Grano entero' : 'Molido'}
                    </div>
                    {selectedPlan.price && (
                      <p className="font-serif text-2xl text-coffee-900 dark:text-cream">${selectedPlan.price} <span className="text-coffee-500 text-sm font-sans">/ mes</span></p>
                    )}
                  </div>
                  {/* Address validation banner */}
                  {user && !hasAddress && (
                    <div className="flex items-start gap-3 bg-yellow-900/20 border border-yellow-500/30 p-4 mb-6">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-yellow-300 text-sm font-medium mb-1">Dirección de envío requerida</p>
                        <p className="text-yellow-400/70 text-xs leading-relaxed mb-2">
                          Necesitas agregar tu dirección de envío completa antes de activar tu suscripción.
                        </p>
                        <Link to="/perfil/datos" className="inline-flex items-center gap-1 text-xs text-gold-400 hover:text-gold-300 underline transition-colors">
                          <MapPin className="w-3 h-3" /> Ir a mis datos
                        </Link>
                      </div>
                    </div>
                  )}
                  {!user && (
                    <div className="flex items-start gap-3 bg-coffee-100 dark:bg-coffee-800/60 border border-coffee-200 dark:border-coffee-700 p-4 mb-6">
                      <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                      <p className="text-coffee-700 dark:text-coffee-300 text-xs leading-relaxed">
                        Para recibir tus envíos necesitamos tu dirección. <Link to="/registro" className="text-gold-400 hover:text-gold-300 underline">Crea tu cuenta</Link> y agrégala en tu perfil antes de confirmar.
                      </p>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="space-y-5">
                    <div className="gold-line mb-5" />
                    <h3 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Tus datos</h3>
                    {[
                      { name: 'name',  label: 'Nombre completo *', type: 'text',  required: true,  placeholder: 'Tu nombre' },
                      { name: 'email', label: 'Email *',           type: 'email', required: true,  placeholder: 'tu@email.com' },
                      { name: 'phone', label: 'Teléfono',          type: 'tel',   required: false, placeholder: '55 1234 5678' },
                    ].map(({ name, label, type, required, placeholder }) => (
                      <div key={name}>
                        <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">{label}</label>
                        <input
                          name={name} type={type} required={required} placeholder={placeholder}
                          value={(form as any)[name]}
                          onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))}
                          className="input-dark !text-base min-h-[48px]"
                        />
                      </div>
                    ))}
                    <div className="border-t border-coffee-200 dark:border-coffee-800 pt-5 mt-2">
                      <p className="text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-4">Dirección de envío</p>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">Dirección *</label>
                          <input name="address" required value={form.address}
                            onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                            placeholder="Calle, número, colonia"
                            className="input-dark !text-base min-h-[48px] w-full"
                          />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">Ciudad *</label>
                            <input name="city" required value={form.city}
                              onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                              placeholder="Ciudad"
                              className="input-dark !text-base min-h-[48px] w-full"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">Estado *</label>
                            <select name="state" required value={form.state}
                              onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                              className="input-dark !text-base min-h-[48px] w-full"
                            >
                              <option value="">Seleccionar</option>
                              {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">CP *</label>
                            <input name="zipCode" required value={form.zipCode}
                              onChange={(e) => setForm((f) => ({ ...f, zipCode: e.target.value }))}
                              placeholder="12345"
                              className="input-dark !text-base min-h-[48px] w-full"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-3">Frecuencia de envío</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[{ value: 'monthly', label: 'Mensual' }, { value: 'bimonthly', label: 'Bimestral' }].map(({ value, label }) => (
                          <button key={value} type="button"
                            onClick={() => setForm((f) => ({ ...f, frequency: value }))}
                            className={`py-3 text-xs font-medium tracking-widest uppercase border transition-all ${
                              form.frequency === value
                                ? 'border-gold-500 text-gold-400 bg-gold-500/10'
                                : 'border-coffee-300 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-500 dark:hover:border-coffee-600 hover:text-coffee-900 dark:hover:text-cream'
                            }`}>
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {error && (
                      <div className="flex items-start gap-2 text-red-400 text-sm">
                        <span>{error}</span>
                        {error.includes('dirección') && (
                          <Link to="/perfil/datos" className="text-gold-400 hover:text-gold-300 underline text-xs shrink-0 self-center">
                            Ir ahora
                          </Link>
                        )}
                      </div>
                    )}
                    <button type="submit" disabled={loading || (!!user && !hasAddress)} className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Procesando…' : 'Confirmar suscripción'}
                    </button>
                    <p className="text-coffee-500 dark:text-coffee-600 text-xs text-center">
                      El pago se procesará con el método que elijas a continuación.
                    </p>
                  </form>
                </>
              )}
            </div>
          </motion.div>
        )}

        {/* Step 4: Payment method */}
        {step === 4 && selectedPlan && setupClientSecret && (
          <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
              <button onClick={() => goToStep(3)} className="flex items-center gap-1 text-coffee-500 hover:text-coffee-900 dark:hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar datos
              </button>
              <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-5 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-coffee-500 uppercase tracking-widest">Tu suscripción</span>
                  <span className="text-gold-400 text-sm font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                  <Coffee className="w-3.5 h-3.5 text-gold-500" />
                  {selectedCoffees.length} café{selectedCoffees.length !== 1 ? 's' : ''}
                </div>
                {selectedPlan.price && (
                  <p className="font-serif text-2xl text-coffee-900 dark:text-cream">${selectedPlan.price} <span className="text-coffee-500 text-sm font-sans">/ mes</span></p>
                )}
              </div>
              <div className="gold-line mb-5" />
              <h3 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Método de pago</h3>
              <Elements stripe={loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '')} options={{ clientSecret: setupClientSecret }}>
                <SubscriptionCardForm
                  clientSecret={setupClientSecret}
                  onSuccess={async (pmId) => {
                    setPaymentMethodId(pmId);
                    // Submit subscription now with payment method
                    if (!selectedPlan) return;
                    setLoading(true); setError(''); setPaymentError('');
                    try {
                      setIsUpgrade(false);
                      await subscriptionsApi.create({
                        ...form,
                        plan: selectedPlan.id,
                        grindPreference,
                        items: selectedCoffees,
                        paymentMethodId: pmId,
                        ...(user ? { userId: user.id } : {}),
                      });
                      useUser.getState().setHasSubscription(true);
                      setSuccess(true);
                    } catch (err: any) {
                      setError(err.response?.data?.error || 'Error al procesar suscripción.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  onError={(msg) => setPaymentError(msg)}
                  loading={loading}
                />
              </Elements>
              {paymentError && (
                <div className="flex items-start gap-2 text-red-400 text-sm mt-4">
                  <span>{paymentError}</span>
                </div>
              )}
              {error && (
                <div className="flex items-start gap-2 text-red-400 text-sm mt-2">
                  <span>{error}</span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* B2B Confirmation Modal */}
        {showB2BConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-md w-full bg-white dark:bg-coffee-900 border border-gold-500/30 p-8 text-center"
            >
              <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-gold-500" />
              </div>
              <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-3">¡Solicitud enviada!</h2>
              <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed mb-6">
                Te contactaremos en <span className="font-medium text-gold-400">24h</span> para diseñar tu plan personalizado.
              </p>
              <button
                onClick={() => {
                  setShowB2BConfirm(false);
                  goToStep(1);
                }}
                className="btn-primary w-full"
              >
                Volver al inicio
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SubscriptionCardForm({ clientSecret, onSuccess, onError, loading }: {
  clientSecret: string;
  onSuccess: (pmId: string) => void;
  onError: (msg: string) => void;
  loading: boolean;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const result = await stripe.confirmSetup({
        elements,
        redirect: 'if_required',
        confirmParams: { return_url: window.location.origin + '/suscripciones' },
      });
      if (result.error) {
        onError(result.error.message || 'Error al guardar tarjeta.');
      } else if (result.setupIntent?.status === 'succeeded') {
        onSuccess(result.setupIntent.payment_method as string);
      } else {
        onError('No se pudo configurar el método de pago.');
      }
    } catch (err: any) {
      onError(err.message || 'Error al procesar tarjeta.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveCard}>
      <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-5 mb-6">
        <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-4">Tarjeta de crédito o débito</p>
        <div className="px-3 py-3 border border-coffee-200 dark:border-coffee-700 bg-white dark:bg-coffee-900 min-h-[48px]">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#1a120b',
                  '::placeholder': { color: '#a0927e' },
                },
              },
            }}
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={!stripe || saving || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving || loading ? 'Procesando…' : 'Guardar método de pago y confirmar'}
      </button>
    </form>
  );
}
