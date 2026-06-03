import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Truck, RefreshCw, ChevronRight, ChevronLeft, Coffee, AlertTriangle, MapPin, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { subscriptionsApi } from '../api';
import { useUser } from '../context/UserContext';
import ScrollReveal from '../components/ScrollReveal';
import CoffeePicker from '../components/CoffeePicker';
import type { SubscriptionPlan } from '../types';
import { PLAN_SLOTS } from '../types';

const plans: Array<{
  id: SubscriptionPlan;
  name: string;
  price: number | null;
  subtitle: string;
  description: string;
  features: string[];
  excluded: string[];
  featured: boolean;
}> = [
  {
    id: 'FUNDADOR', name: 'Fundador', price: 350,
    subtitle: '2 lotes × 250g / mes',
    description: 'Para quien empieza su camino en el café de especialidad.',
    features: ['2 cafés de especialidad a elegir', 'Grano entero o molido', 'Notas de catación incluidas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Ediciones limitadas', 'Microlotes exclusivos'],
    featured: false,
  },
  {
    id: 'EXPLORADOR', name: 'Explorador', price: 650,
    subtitle: '2-3 lotes × 250g / mes',
    description: 'Descubre diferentes orígenes y procesos cada mes.',
    features: ['2 a 3 cafés a elegir', 'Acceso a microlotes', 'Grano entero o molido', 'Notas de catación detalladas', 'Envío incluido', 'Cancela cuando quieras'],
    excluded: ['Experimentales anaeróbicos'],
    featured: true,
  },
  {
    id: 'CONNOISSEUR', name: 'Connoisseur', price: 890,
    subtitle: '3 lotes premium / mes',
    description: 'Los lotes más exclusivos y complejos del catálogo.',
    features: ['3 cafés premium a elegir', 'Acceso a ediciones limitadas', 'Cafés experimentales y anaeróbicos', 'Prioridad en microlotes', 'Notas de catación extendidas', 'Envío exprés incluido'],
    excluded: [],
    featured: false,
  },
  {
    id: 'EMPRESARIAL', name: 'Empresarial', price: null,
    subtitle: 'Mínimo 10 lotes / mes',
    description: 'Para oficinas y negocios que quieren ofrecer especialidad.',
    features: ['Mínimo 10 lotes a elegir', 'Todo el catálogo disponible', '15% descuento por volumen', 'Gestor de cuenta dedicado', 'Facturación mensual', 'Envío exprés'],
    excluded: [],
    featured: false,
  },
];

type Step = 1 | 2 | 3;
interface FormData { name: string; email: string; phone: string; frequency: string; }

export default function Subscriptions() {
  const user = useUser((s) => s.user);
  const hasSubscription = useUser((s) => s.hasSubscription);
  const [step, setStep] = useState<Step>(1);
  const [selectedPlan, setSelectedPlan] = useState<typeof plans[0] | null>(null);
  const [selectedCoffees, setSelectedCoffees] = useState<string[]>([]);
  const [grindPreference, setGrindPreference] = useState<'MOLIDO' | 'GRANO'>('GRANO');
  const [form, setForm] = useState<FormData>({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    frequency: 'monthly',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const hasAddress = !!(user?.address && user?.city && user?.state && user?.zipCode);

  const goToStep = (n: Step) => {
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPlan = (plan: typeof plans[0]) => {
    setSelectedPlan(plan);
    setSelectedCoffees([]);
    goToStep(2);
  };

  const handleCoffeeNext = () => {
    if (!selectedPlan) return;
    const slots = PLAN_SLOTS[selectedPlan.id];
    if (selectedCoffees.length < slots.min) return;
    goToStep(3);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;

    if (user && !hasAddress) {
      setError('Necesitas agregar tu dirección de envío en tu perfil antes de suscribirte.');
      return;
    }

    setLoading(true); setError('');
    try {
      await subscriptionsApi.create({
        ...form,
        plan: selectedPlan.id,
        grindPreference,
        items: selectedCoffees,
        ...(user ? { userId: user.id } : {}),
      });
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar suscripción. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const stepLabels = ['Elige tu plan', 'Tus cafés', 'Finalizar'];

  if (success) {
    return (
      <div className="min-h-screen bg-coffee-950 pt-20 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-coffee-900 border border-gold-500/30 p-12 text-center"
        >
          <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-gold-500" />
          </div>
          <h2 className="font-serif text-3xl text-cream mb-3">¡Suscripción confirmada!</h2>
          <p className="text-coffee-300 text-sm leading-relaxed mb-4">
            Bienvenido al plan <span className="text-gold-400 font-medium">{selectedPlan?.name}</span>.
            Tu primer envío incluirá {selectedCoffees.length} lote{selectedCoffees.length !== 1 ? 's' : ''} tostados a pedido.
          </p>
          <p className="text-coffee-500 text-xs">Nos pondremos en contacto para coordinar el pago del primer ciclo.</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="bg-coffee-950 pt-20 min-h-screen">
      {/* Hero */}
      <div className="bg-coffee-900 border-b border-coffee-800 py-12">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="gold-line mx-auto mb-4" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-3">Suscripciones</h1>
            <p className="text-coffee-400 text-sm leading-relaxed max-w-lg mx-auto">
              Selecciona tus cafés favoritos. Tostamos a pedido, enviamos frescos cada mes.
            </p>
            <div className="flex items-center justify-center gap-8 mt-6 text-coffee-500 text-xs">
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
                    'bg-coffee-800 text-coffee-600'
                  }`}>
                    {step > n ? <Check className="w-3.5 h-3.5" /> : n}
                  </div>
                  <span className={`text-xs transition-colors ${step === n ? 'text-cream' : 'text-coffee-600'}`}>{label}</span>
                </div>
                {i < stepLabels.length - 1 && <div className="flex-1 h-px bg-coffee-800 mx-3" />}
              </div>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Plan selection */}
        {step === 1 && (
          <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              {hasSubscription && (
                <div className="flex items-center justify-between bg-gold-500/10 border border-gold-500/30 px-5 py-4 mb-8">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-gold-500 shrink-0" />
                    <div>
                      <p className="text-cream text-sm font-medium">Ya tienes una suscripción activa</p>
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
                    className={`relative flex flex-col border cursor-pointer transition-all duration-300 group
                      ${plan.featured
                        ? 'border-gold-500 bg-coffee-900 shadow-[0_0_40px_rgba(201,169,110,0.1)]'
                        : 'border-coffee-800 bg-coffee-900/60 hover:border-coffee-700'
                      }`}
                  >
                    {plan.featured && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-gold-500 text-coffee-950 text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1">Más popular</span>
                      </div>
                    )}
                    <div className="p-6 flex-1">
                      <h3 className="font-serif text-xl text-cream mb-1">{plan.name}</h3>
                      <p className="text-coffee-500 text-[10px] tracking-widest uppercase mb-4">{plan.subtitle}</p>
                      {plan.price ? (
                        <div className="flex items-baseline gap-1 mb-4">
                          <span className="font-serif text-3xl text-cream">${plan.price}</span>
                          <span className="text-coffee-500 text-xs">/ mes</span>
                        </div>
                      ) : (
                        <p className="font-serif text-lg text-gold-500 mb-4">A precio de lote</p>
                      )}
                      <p className="text-coffee-400 text-xs leading-relaxed mb-5">{plan.description}</p>
                      <div className="border-t border-coffee-800 mb-5" />
                      <ul className="space-y-2">
                        {plan.features.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-300">
                            <Check className="w-3.5 h-3.5 text-gold-500 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                        {plan.excluded.map((f) => (
                          <li key={f} className="flex items-start gap-2 text-xs text-coffee-600">
                            <X className="w-3.5 h-3.5 text-coffee-700 shrink-0 mt-0.5" />{f}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="p-6 pt-0">
                      <button
                        type="button"
                        className={`w-full py-3 text-xs font-semibold tracking-[0.2em] uppercase transition-all flex items-center justify-center gap-2
                          ${plan.featured
                            ? 'bg-gold-500 text-coffee-950 group-hover:bg-gold-400'
                            : 'bg-coffee-800 text-coffee-300 border border-coffee-700 group-hover:border-gold-500/40 group-hover:text-cream'
                          }`}
                      >
                        {hasSubscription ? `Cambiar a ${plan.name}` : `Elegir ${plan.name}`} <ChevronRight className="w-3.5 h-3.5" />
                      </button>
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
              <button onClick={() => goToStep(1)} className="flex items-center gap-1 text-coffee-500 hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar plan
              </button>
              <div className="flex items-center gap-3 mb-8">
                <div className="gold-line" />
                <h2 className="font-serif text-3xl text-cream">Plan {selectedPlan.name}</h2>
              </div>
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
                  disabled={selectedCoffees.length < PLAN_SLOTS[selectedPlan.id].min}
                  onClick={handleCoffeeNext}
                  className="btn-primary flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Continuar <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3: Contact form */}
        {step === 3 && selectedPlan && (
          <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.3 }}>
            <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
              <button onClick={() => goToStep(2)} className="flex items-center gap-1 text-coffee-500 hover:text-cream text-xs mb-8 transition-colors">
                <ChevronLeft className="w-3.5 h-3.5" /> Cambiar cafés
              </button>
              <div className="bg-coffee-900 border border-coffee-800 p-5 mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-coffee-500 uppercase tracking-widest">Tu suscripción</span>
                  <span className="text-gold-400 text-sm font-medium">{selectedPlan.name}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-coffee-400 mb-3">
                  <Coffee className="w-3.5 h-3.5 text-gold-500" />
                  {selectedCoffees.length} café{selectedCoffees.length !== 1 ? 's' : ''} seleccionados · {grindPreference === 'GRANO' ? 'Grano entero' : 'Molido'}
                </div>
                {selectedPlan.price && (
                  <p className="font-serif text-2xl text-cream">${selectedPlan.price} <span className="text-coffee-500 text-sm font-sans">/ mes</span></p>
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
                <div className="flex items-start gap-3 bg-coffee-800/60 border border-coffee-700 p-4 mb-6">
                  <MapPin className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                  <p className="text-coffee-300 text-xs leading-relaxed">
                    Para recibir tus envíos necesitamos tu dirección. <Link to="/registro" className="text-gold-400 hover:text-gold-300 underline">Crea tu cuenta</Link> y agrégala en tu perfil antes de confirmar.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="gold-line mb-5" />
                <h3 className="font-serif text-2xl text-cream mb-6">Tus datos</h3>
                {[
                  { name: 'name',  label: 'Nombre completo *', type: 'text',  required: true,  placeholder: 'Tu nombre' },
                  { name: 'email', label: 'Email *',           type: 'email', required: true,  placeholder: 'tu@email.com' },
                  { name: 'phone', label: 'Teléfono',          type: 'tel',   required: false, placeholder: '55 1234 5678' },
                ].map(({ name, label, type, required, placeholder }) => (
                  <div key={name}>
                    <label className="block text-[10px] text-coffee-500 uppercase tracking-[0.2em] mb-2">{label}</label>
                    <input
                      name={name} type={type} required={required} placeholder={placeholder}
                      value={(form as any)[name]}
                      onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))}
                      className="input-dark"
                    />
                  </div>
                ))}
                <div>
                  <label className="block text-[10px] text-coffee-500 uppercase tracking-[0.2em] mb-3">Frecuencia de envío</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[{ value: 'monthly', label: 'Mensual' }, { value: 'bimonthly', label: 'Bimestral' }].map(({ value, label }) => (
                      <button key={value} type="button"
                        onClick={() => setForm((f) => ({ ...f, frequency: value }))}
                        className={`py-3 text-xs font-medium tracking-widest uppercase border transition-all ${
                          form.frequency === value
                            ? 'border-gold-500 text-gold-400 bg-gold-500/10'
                            : 'border-coffee-700 text-coffee-400 hover:border-coffee-600 hover:text-cream'
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
                <p className="text-coffee-600 text-xs text-center">
                  El pago se coordina por transferencia. Te enviamos los datos al correo proporcionado.
                </p>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
