import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
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
    description: 'Ideal para el consumidor que busca calidad y consistencia en su rutina diaria.',
    features: [
      '250g de café de especialidad',
      'Origen único seleccionado',
      'Notas de catación incluidas',
      'Envío incluido',
      'Cancela cuando quieras',
    ],
    excluded: ['Acceso a microlotes', 'Cafés experimentales', 'Prioridad en ediciones limitadas'],
    color: 'border-coffee-700',
    badge: null,
  },
  {
    id: 'EXPLORADOR',
    name: 'Explorador',
    price: 650,
    subtitle: '500g / mes (2 lotes)',
    description: 'Para quien quiere descubrir diferentes orígenes y procesos cada mes.',
    features: [
      '500g de café (2 bolsas x 250g)',
      '2 orígenes diferentes al mes',
      'Notas de catación detalladas',
      'Envío incluido',
      'Acceso a microlotes',
      'Cancela cuando quieras',
    ],
    excluded: ['Cafés experimentales', 'Prioridad en ediciones limitadas'],
    color: 'border-gold-500',
    badge: 'Más popular',
  },
  {
    id: 'CONNOISSEUR',
    name: 'Connoisseur',
    price: 890,
    subtitle: '500g premium / mes',
    description: 'Para el entusiasta que busca los lotes más exclusivos y complejos.',
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
    color: 'border-coffee-700',
    badge: null,
  },
];

interface FormData {
  name: string;
  email: string;
  phone: string;
  plan: string;
  bundleId?: string;
  frequency: string;
}

export default function Subscriptions() {
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedBundle, setSelectedBundle] = useState<string | null>(null);
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [form, setForm] = useState<FormData>({ name: '', email: '', phone: '', plan: '', frequency: 'monthly' });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
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
    setLoading(true);
    setError('');
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
      <div className="bg-coffee-900 border-b border-coffee-800 py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="w-12 h-[2px] bg-gold-500 mx-auto mb-6" />
            <h1 className="font-serif text-5xl md:text-6xl text-cream mb-4">Suscripciones</h1>
            <p className="text-coffee-300 text-lg max-w-xl mx-auto">
              Café fresco tostado a pedido, entregado en tu puerta dentro de los primeros 7 días del tueste.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Plans */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {/* Bundles Section */}
        {!bundlesLoading && bundles.length > 0 && (
          <div className="mb-20">
            <div className="mb-12">
              <div className="w-12 h-[2px] bg-gold-500 mb-4" />
              <h2 className="font-serif text-4xl text-cream mb-3">Paquetes especiales</h2>
              <p className="text-coffee-400 max-w-2xl">
                Combina tu café favorito con accesorios curados para la experiencia perfecta.
              </p>
            </div>
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
            <div className="border-b border-coffee-800 my-12" />
          </div>
        )}

        {/* Plans */}
        <div className="mb-12">
          <div className="mb-8">
            <h2 className="font-serif text-4xl text-cream mb-2">Planes de suscripción</h2>
            <p className="text-coffee-400">Elige el plan que mejor se adapte a tu ritmo de café.</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <ScrollReveal key={plan.id} delay={i * 0.1}>
              <div
                className={`relative border-2 ${plan.color} ${
                  selected === plan.id ? 'border-gold-500 bg-coffee-900/80' : 'bg-coffee-900'
                } p-8 transition-all duration-300 cursor-pointer hover:border-gold-500/50`}
                onClick={() => handleSelect(plan.id)}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gold-500 text-coffee-950 text-xs font-bold px-4 py-1 uppercase tracking-widest">
                    {plan.badge}
                  </div>
                )}

                <h3 className="font-serif text-2xl text-cream mb-1">{plan.name}</h3>
                <p className="text-coffee-400 text-sm mb-4">{plan.subtitle}</p>

                <div className="mb-4">
                  <span className="font-serif text-4xl text-cream font-bold">${plan.price}</span>
                  <span className="text-coffee-400 text-sm ml-2">MXN / mes</span>
                </div>

                <p className="text-coffee-300 text-sm leading-relaxed mb-6">{plan.description}</p>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-coffee-200">
                      <Check className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                  {plan.excluded.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-coffee-600 line-through">
                      <X className="w-4 h-4 text-coffee-700 shrink-0 mt-0.5" />
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleSelect(plan.id)}
                  className={`w-full py-3 text-sm uppercase tracking-wide font-medium transition-all ${
                    selected === plan.id
                      ? 'bg-gold-500 text-coffee-950'
                      : 'border border-coffee-600 text-coffee-300 hover:border-gold-500/50 hover:text-cream'
                  }`}
                >
                  {selected === plan.id ? 'Seleccionado ✓' : 'Elegir plan'}
                </button>
              </div>
            </ScrollReveal>
          ))}
        </div>

        {/* Form */}
        <AnimatePresence>
          {(selected || selectedBundle) && !success && (
            <motion.div
              id="subscribe-form"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="mt-16 max-w-2xl mx-auto"
            >
              <div className="gold-line mb-6" />
              <h2 className="font-serif text-3xl text-cream mb-2">Completar suscripción</h2>
              <p className="text-coffee-400 text-sm mb-8">
                {selectedBundle && (
                  <>
                    Paquete: <span className="text-gold-500">{bundles.find((b) => b.id === selectedBundle)?.name}</span>
                    {selected && ' • '}
                  </>
                )}
                {selected && (
                  <>
                    Plan: <span className="text-gold-500">{plans.find((p) => p.id === selected)?.name}</span>
                  </>
                )}
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Nombre completo *</label>
                    <input
                      required
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                      placeholder="Tu nombre"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Email *</label>
                    <input
                      required
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                      placeholder="tu@email.com"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Teléfono</label>
                    <input
                      value={form.phone}
                      onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                      placeholder="55 1234 5678"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">Frecuencia</label>
                    <select
                      value={form.frequency}
                      onChange={(e) => setForm((f) => ({ ...f, frequency: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="bimonthly">Bimestral</option>
                    </select>
                  </div>
                </div>

                {error && <p className="text-red-400 text-sm">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : 'Confirmar suscripción'}
                </button>

                <p className="text-coffee-500 text-xs text-center">
                  Sin contratos. Cancela en cualquier momento. Te contactaremos para coordinar tu primer envío.
                </p>
              </form>
            </motion.div>
          )}

          {success && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-16 max-w-lg mx-auto text-center bg-coffee-900 border border-gold-500/30 p-12"
            >
              <div className="w-16 h-16 border-2 border-gold-500 flex items-center justify-center mx-auto mb-6">
                <Check className="w-8 h-8 text-gold-500" />
              </div>
              <h3 className="font-serif text-3xl text-cream mb-3">¡Bienvenido!</h3>
              <p className="text-coffee-300 leading-relaxed">
                Tu suscripción ha sido registrada. Te contactaremos en las próximas 24 horas para coordinar tu primer envío de café de especialidad.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
