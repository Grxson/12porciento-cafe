import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Star, Truck, RefreshCw } from 'lucide-react';
import { subscriptionsApi, bundlesApi } from '../api';
import ScrollReveal from '../components/ScrollReveal';
import BundleCard from '../components/BundleCard';
import type { Bundle } from '../types';

const plans = [
  {
    id: 'FUNDADOR',
    name: 'Fundador',
    price: 350,
    subtitle: '250g / mes',
    description: 'Para quien empieza su camino en el café de especialidad.',
    features: [
      '250g de café de especialidad',
      'Origen único seleccionado',
      'Notas de catación incluidas',
      'Envío incluido',
      'Cancela cuando quieras',
    ],
    excluded: ['Acceso a microlotes', 'Cafés experimentales', 'Prioridad en ediciones limitadas'],
    featured: false,
  },
  {
    id: 'EXPLORADOR',
    name: 'Explorador',
    price: 650,
    subtitle: '500g / mes · 2 lotes',
    description: 'Descubre diferentes orígenes y procesos cada mes.',
    features: [
      '500g de café (2 bolsas x 250g)',
      '2 orígenes diferentes al mes',
      'Notas de catación detalladas',
      'Envío incluido',
      'Acceso a microlotes',
      'Cancela cuando quieras',
    ],
    excluded: ['Cafés experimentales', 'Prioridad en ediciones limitadas'],
    featured: true,
  },
  {
    id: 'CONNOISSEUR',
    name: 'Connoisseur',
    price: 890,
    subtitle: '500g premium / mes',
    description: 'Los lotes más exclusivos y complejos del catálogo.',
    features: [
      '500g de café premium seleccionado',
      'Acceso prioritario a microlotes',
      'Cafés experimentales y anaeróbicos',
      'Prioridad en ediciones limitadas',
      'Notas de catación extendidas',
      'Envío exprés incluido',
      'Cancela cuando quieras',
    ],
    excluded: [],
    featured: false,
  },
];

interface FormData {
  name: string; email: string; phone: string;
  plan: string; bundleId?: string; frequency: string;
}

export default function Subscriptions() {
  const [selected, setSelected]         = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [bundles, setBundles]           = useState<Bundle[]>([]);
  const [form, setForm]                 = useState<FormData>({ name: '', email: '', phone: '', plan: '', frequency: 'monthly' });
  const [loading, setLoading]           = useState(false);
  const [success, setSuccess]           = useState(false);
  const [error, setError]               = useState('');
  const [bundlesLoading, setBundlesLoading] = useState(true);

  useEffect(() => {
    bundlesApi.list().then((res) => {
      setBundles(res.data.data || []);
      setBundlesLoading(false);
    }).catch(() => setBundlesLoading(false));
  }, []);

  const handleSelect = (planId: string) => {
    setSelected(planId);
    setForm((f) => ({ ...f, plan: planId }));
    setTimeout(() => {
      document.getElementById('subscribe-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const submitData = { ...form };
      if (selectedBundle) submitData.bundleId = selectedBundle;
      await subscriptionsApi.create(submitData);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al procesar suscripción. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-coffee-950 pt-20 min-h-screen">
      {/* Hero */}
      <div className="page-header text-center">
        <div className="max-w-3xl mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="gold-line mx-auto mb-6" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-4">Suscripciones</h1>
            <p className="text-coffee-300 text-lg max-w-xl mx-auto leading-relaxed">
              Café fresco tostado a pedido, en tu puerta dentro de los primeros 7 días del tueste.
            </p>
            <div className="flex items-center justify-center gap-8 mt-8 text-coffee-400 text-sm">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-gold-500" />
                <span>Envío incluido</span>
              </div>
              <div className="flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-gold-500" />
                <span>Cancela cuando quieras</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-gold-500" />
                <span>SCA ≥ 84 pts</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative flex flex-col border transition-all duration-300 cursor-pointer
                ${plan.featured
                  ? 'border-gold-500 bg-coffee-900 shadow-[0_0_40px_rgba(201,169,110,0.12)]'
                  : 'border-coffee-800 bg-coffee-900/60 hover:border-coffee-700'
                }
                ${selected === plan.id ? 'ring-2 ring-gold-500/40' : ''}
              `}
              onClick={() => handleSelect(plan.id)}
            >
              {/* Featured badge */}
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-gold-500 text-coffee-950 text-[10px] font-bold uppercase tracking-[0.2em] px-3 py-1">
                    Más popular
                  </span>
                </div>
              )}

              <div className="p-7 flex-1">
                {/* Plan name + price */}
                <div className="mb-6">
                  <h3 className="font-serif text-2xl text-cream mb-1">{plan.name}</h3>
                  <p className="text-coffee-400 text-xs tracking-widest uppercase mb-4">{plan.subtitle}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-serif text-4xl text-cream">${plan.price}</span>
                    <span className="text-coffee-400 text-sm">/ mes</span>
                  </div>
                </div>

                <p className="text-coffee-400 text-sm leading-relaxed mb-6">{plan.description}</p>

                {/* Divider */}
                <div className="border-t border-coffee-800 mb-6" />

                {/* Features */}
                <ul className="space-y-2.5 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-coffee-200">
                      <Check className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-coffee-600">
                      <X className="w-4 h-4 text-coffee-700 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              {/* CTA */}
              <div className="p-7 pt-0">
                <button
                  onClick={(e) => { e.stopPropagation(); handleSelect(plan.id); }}
                  className={`w-full py-3 text-sm font-semibold tracking-[0.15em] uppercase transition-all duration-200 cursor-pointer
                    ${selected === plan.id
                      ? 'bg-gold-500 text-coffee-950'
                      : plan.featured
                        ? 'bg-gold-500/20 text-gold-400 border border-gold-500/30 hover:bg-gold-500 hover:text-coffee-950'
                        : 'bg-coffee-800 text-coffee-300 border border-coffee-700 hover:border-gold-500/40 hover:text-cream'
                    }`}
                >
                  {selected === plan.id ? '✓ Seleccionado' : 'Seleccionar'}
                </button>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bundles section */}
        {!bundlesLoading && bundles.length > 0 && (
          <div className="mt-20">
            <ScrollReveal className="mb-10">
              <div className="gold-line mb-4" />
              <h2 className="font-serif text-4xl text-cream mb-3">Paquetes especiales</h2>
              <p className="text-coffee-400 max-w-xl text-sm leading-relaxed">
                Combina tu café favorito con accesorios curados para la experiencia perfecta.
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {bundles.map((bundle) => (
                <BundleCard
                  key={bundle.id}
                  {...bundle}
                  onSelect={(id) => {
                    setSelectedBundle(id);
                    setTimeout(() => {
                      document.getElementById('subscribe-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }, 100);
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Subscribe form */}
        <AnimatePresence>
          {selected && (
            <motion.div
              id="subscribe-form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.4 }}
              className="mt-16 max-w-xl mx-auto"
            >
              <div className="bg-coffee-900 border border-coffee-800 p-8">
                <div className="gold-line mb-5" />
                <h3 className="font-serif text-2xl text-cream mb-1">
                  Suscripción {plans.find((p) => p.id === selected)?.name}
                </h3>
                <p className="text-coffee-400 text-sm mb-8">
                  ${plans.find((p) => p.id === selected)?.price} / mes · {plans.find((p) => p.id === selected)?.subtitle}
                </p>

                {success ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-5">
                      <Check className="w-8 h-8 text-gold-500" />
                    </div>
                    <h4 className="font-serif text-2xl text-cream mb-2">¡Suscripción confirmada!</h4>
                    <p className="text-coffee-300 text-sm leading-relaxed">
                      Nos pondremos en contacto contigo para confirmar los detalles de pago y tu primer envío.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {[
                      { name: 'name',  label: 'Nombre completo *', type: 'text',  required: true,  placeholder: 'Tu nombre' },
                      { name: 'email', label: 'Email *',            type: 'email', required: true,  placeholder: 'tu@email.com' },
                      { name: 'phone', label: 'Teléfono',           type: 'tel',   required: false, placeholder: '55 1234 5678' },
                    ].map(({ name, label, type, required, placeholder }) => (
                      <div key={name}>
                        <label className="block text-[10px] text-coffee-400 uppercase tracking-[0.2em] mb-2">{label}</label>
                        <input
                          name={name} type={type} required={required}
                          placeholder={placeholder}
                          value={(form as any)[name]}
                          onChange={(e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }))}
                          className="input-dark"
                        />
                      </div>
                    ))}

                    <div>
                      <label className="block text-[10px] text-coffee-400 uppercase tracking-[0.2em] mb-2">Frecuencia</label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'monthly',    label: 'Mensual' },
                          { value: 'bimonthly',  label: 'Bimestral' },
                        ].map(({ value, label }) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, frequency: value }))}
                            className={`py-2.5 text-xs font-medium tracking-widest uppercase border transition-all cursor-pointer ${
                              form.frequency === value
                                ? 'border-gold-500 text-gold-400 bg-gold-500/10'
                                : 'border-coffee-700 text-coffee-400 hover:border-coffee-600 hover:text-cream'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {error && <p className="text-red-400 text-sm">{error}</p>}

                    <button type="submit" disabled={loading} className="btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed">
                      {loading ? 'Procesando…' : 'Confirmar suscripción'}
                    </button>
                    <p className="text-coffee-500 text-xs text-center leading-relaxed">
                      El pago se coordina por transferencia. Te enviamos los datos al email proporcionado.
                    </p>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
