import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Package,
  Mail,
  Phone,
  User,
  FileText,
  CheckCircle,
  TrendingUp,
  Truck,
  X,
  Coffee,
  MessageSquare,
} from 'lucide-react';
import { b2bApi } from '../api';
import type { B2BProduct } from '../types';

const HERO_IMG =
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1400&q=80';

const benefits = [
  {
    icon: Coffee,
    title: '100% Mexicano',
    desc: 'Selección directa de fincas en Veracruz, Chiapas y Oaxaca. Sin intermediarios.',
  },
  {
    icon: TrendingUp,
    title: 'Precios B2B',
    desc: 'Precios preferenciales por volumen. Hasta 30% de descuento vs retail.',
  },
  {
    icon: MessageSquare,
    title: 'Asesoría experta',
    desc: 'Te ayudamos a elegir el café ideal para tu negocio. Catas guiadas incluidas.',
  },
  {
    icon: Truck,
    title: 'Envío a todo México',
    desc: 'Logística propia. Entrega garantizada en 48-72 hrs a cualquier estado.',
  },
];

interface FormData {
  businessName: string;
  contactoNombre: string;
  contactoEmail: string;
  contactoTelefono: string;
  rfc: string;
  volumenEstimado: string;
  giroNegocio: string;
}

const initialForm: FormData = {
  businessName: '',
  contactoNombre: '',
  contactoEmail: '',
  contactoTelefono: '',
  rfc: '',
  volumenEstimado: '',
  giroNegocio: '',
};

export default function B2BCatalog() {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<FormData>(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    b2bApi
      .catalog()
      .then((res) => setProducts(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const openForm = () => {
    setShowModal(true);
    setSubmitted(false);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.contactoEmail.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      await b2bApi.inquiry({ ...form, volumenEstimado: form.volumenEstimado.trim() });
      setSubmitted(true);
    } catch {
      setError('Error al enviar. Intenta de nuevo.');
    } finally {
      setSubmitting(false);
    }
  };

  // Total unique price tiers count for catalog label
  const totalTiers = products.reduce((acc, p) => acc + p.b2bPriceTiers.length, 0);

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950">
      {/* ── Hero ── */}
      <section className="relative min-h-[60vh] md:min-h-[50vh] flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMG})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-coffee-950/90 via-coffee-950/70 to-coffee-950/60" />
        <div className="relative z-10 text-center max-w-3xl mx-auto px-4 py-20">
          <Building2 className="w-14 h-14 mx-auto text-gold-500 mb-6" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-cream mb-4 leading-tight">
            Café de especialidad
            <br />
            <span className="text-gold-400">para tu empresa</span>
          </h1>
          <p className="text-cream/80 text-lg md:text-xl max-w-2xl mx-auto mb-8">
            Ofrecemos café mexicano de origen único con precios preferenciales por volumen, asesoría
            personalizada y envío a todo México.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={openForm} className="btn-primary text-lg px-8 py-3">
              Solicitar cotización
            </button>
            <a
              href="#catalogo"
              className="inline-flex items-center justify-center gap-2 border border-cream/30 text-cream hover:bg-cream/10 px-8 py-3 transition-colors"
            >
              Ver catálogo
            </a>
          </div>
        </div>
      </section>

      {/* ── Benefits ── */}
      <section className="max-w-6xl mx-auto px-4 -mt-16 relative z-20">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {benefits.map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-white dark:bg-coffee-900 border border-coffee-100 dark:border-coffee-800 p-5 text-center hover:border-gold-500/30 transition-colors"
            >
              <Icon className="w-8 h-8 text-gold-500 mx-auto mb-3" />
              <h3 className="font-semibold text-coffee-900 dark:text-cream text-sm mb-1">
                {title}
              </h3>
              <p className="text-xs text-coffee-600 dark:text-coffee-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="grid grid-cols-3 gap-8">
          {[
            { label: 'Fincas aliadas', value: '15+' },
            { label: 'Empresas atendidas', value: '120+' },
            { label: 'Estados cobertura', value: '28' },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-3xl md:text-4xl font-serif text-gold-500 mb-1">{value}</p>
              <p className="text-xs text-coffee-500 uppercase tracking-widest">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Catalog ── */}
      <section id="catalogo" className="max-w-6xl mx-auto px-4 pb-16">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-serif text-coffee-900 dark:text-cream">
              Catálogo B2B
            </h2>
            <p className="text-sm text-coffee-500">
              {products.length} productos · {totalTiers} rangos de precio
            </p>
          </div>
          <button
            onClick={openForm}
            className="hidden md:flex items-center gap-2 text-sm text-gold-500 border border-gold-500/30 hover:border-gold-500 px-4 py-2 transition-colors"
          >
            <MessageSquare className="w-4 h-4" /> Cotizar
          </button>
        </div>

        {loading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 bg-coffee-100 dark:bg-coffee-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 mx-auto text-coffee-400 mb-4" />
            <p className="text-coffee-500">Próximamente más productos disponibles</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-coffee-900 border border-coffee-100 dark:border-coffee-700 overflow-hidden hover:border-gold-500/30 transition-colors"
              >
                <button
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  className="w-full text-left flex items-center gap-4 hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors"
                >
                  {/* Product image */}
                  <div className="w-24 h-24 shrink-0 bg-coffee-100 dark:bg-coffee-800 overflow-hidden">
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0 pr-4">
                    <h3 className="font-semibold text-coffee-900 dark:text-cream truncate">
                      {p.name}
                    </h3>
                    <p className="text-sm text-coffee-500 truncate">
                      {p.origin && `${p.origin}`}
                      {p.weight ? ` · ${p.weight}g` : ''}
                    </p>
                    {/* Show lowest price as badge */}
                    {p.b2bPriceTiers.length > 0 && (
                      <p className="text-xs text-gold-500 mt-1.5">
                        Desde{' '}
                        <span className="font-semibold">
                          ${Math.min(...p.b2bPriceTiers.map((t) => t.pricePerUnit)).toFixed(2)}
                        </span>{' '}
                        MXN / ud
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 mr-4 text-coffee-400">
                    <span className="text-xs">{expanded === p.id ? '−' : '+'}</span>
                  </div>
                </button>

                <AnimatePresence>
                  {expanded === p.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-3">
                        <p className="text-sm text-coffee-600 dark:text-cream/70">
                          {p.description}
                        </p>
                        {p.b2bPriceTiers.length > 0 && (
                          <>
                            <table className="hidden md:table w-full text-sm">
                              <thead>
                                <tr className="text-xs text-coffee-500 dark:text-cream/50 text-left">
                                  <th className="pb-1.5 font-medium">Cantidad</th>
                                  <th className="pb-1.5 font-medium">Precio por unidad</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-coffee-100 dark:divide-coffee-700">
                                {p.b2bPriceTiers.map((tier) => (
                                  <tr key={tier.id}>
                                    <td className="py-1.5 text-coffee-900 dark:text-cream">
                                      {tier.minQty}
                                      {tier.maxQty ? `–${tier.maxQty}` : '+'} uds
                                    </td>
                                    <td className="py-1.5 text-coffee-900 dark:text-cream font-medium">
                                      ${tier.pricePerUnit.toFixed(2)} MXN
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            <div className="md:hidden space-y-2">
                              {p.b2bPriceTiers.map((tier) => (
                                <div
                                  key={tier.id}
                                  className="flex items-center justify-between gap-2 bg-white dark:bg-coffee-900 border border-coffee-100 dark:border-coffee-700 px-3 py-2.5"
                                >
                                  <span className="text-sm text-coffee-600 dark:text-cream/70 truncate">
                                    {tier.minQty}
                                    {tier.maxQty ? `–${tier.maxQty}` : '+'} uds
                                  </span>
                                  <span className="text-sm font-medium text-coffee-900 dark:text-cream shrink-0">
                                    ${tier.pricePerUnit.toFixed(2)} MXN
                                  </span>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                        <button
                          onClick={openForm}
                          className="w-full text-sm text-gold-500 border border-gold-500/30 hover:border-gold-500 py-2 transition-colors mt-2"
                        >
                          Cotizar este producto
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Sticky mobile CTA (positioned above BottomNav) ── */}
      <div
        className="fixed left-0 right-0 p-4 bg-coffee-50 dark:bg-coffee-950 border-t border-coffee-200 dark:border-coffee-800 md:hidden z-40 md:hidden"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 56px)' }}
      >
        <button onClick={openForm} className="btn-primary w-full text-base py-3">
          <MessageSquare className="w-4 h-4 inline-block mr-2" />
          Solicitar cotización
        </button>
      </div>

      {/* ── Inquiry Modal ── */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-coffee-950/80 backdrop-blur-sm p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-coffee-900 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-coffee-200 dark:border-coffee-700"
            >
              <div className="flex items-center justify-between p-5 border-b border-coffee-100 dark:border-coffee-800">
                <div>
                  <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">
                    {submitted ? 'Solicitud recibida' : 'Solicitar cotización'}
                  </h2>
                  {!submitted && (
                    <p className="text-sm text-coffee-500">
                      Te enviamos precios personalizados en 24h
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-coffee-500 hover:text-coffee-900 dark:hover:text-cream transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {submitted ? (
                <div className="p-8 text-center space-y-4">
                  <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
                  <h3 className="font-serif text-xl text-coffee-900 dark:text-cream">
                    ¡Cotización solicitada!
                  </h3>
                  <p className="text-coffee-600 dark:text-coffee-400 text-sm">
                    Te contactaremos en 24-48 horas con una cotización personalizada.
                  </p>
                  <button onClick={() => setShowModal(false)} className="btn-primary mt-4">
                    Cerrar
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="p-5 space-y-4">
                  <div>
                    <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                      <Building2 className="w-3.5 h-3.5 text-gold-500" /> Empresa *
                    </label>
                    <input
                      required
                      value={form.businessName}
                      onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                      placeholder="Nombre de tu empresa"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                        <User className="w-3.5 h-3.5 text-gold-500" /> Contacto
                      </label>
                      <input
                        value={form.contactoNombre}
                        onChange={(e) => setForm((f) => ({ ...f, contactoNombre: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                        placeholder="Nombre completo"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                        <Mail className="w-3.5 h-3.5 text-gold-500" /> Email *
                      </label>
                      <input
                        required
                        type="email"
                        value={form.contactoEmail}
                        onChange={(e) => setForm((f) => ({ ...f, contactoEmail: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                        placeholder="correo@empresa.com"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                        <Phone className="w-3.5 h-3.5 text-gold-500" /> Teléfono
                      </label>
                      <input
                        value={form.contactoTelefono}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, contactoTelefono: e.target.value }))
                        }
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                        placeholder="55 1234 5678"
                      />
                    </div>
                    <div>
                      <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                        <FileText className="w-3.5 h-3.5 text-gold-500" /> RFC
                      </label>
                      <input
                        value={form.rfc}
                        onChange={(e) => setForm((f) => ({ ...f, rfc: e.target.value }))}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                        placeholder="RFC"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-coffee-700 dark:text-coffee-300 flex items-center gap-1.5 mb-1.5">
                      <Package className="w-3.5 h-3.5 text-gold-500" /> Volumen estimado
                    </label>
                    <textarea
                      rows={3}
                      value={form.volumenEstimado}
                      onChange={(e) => setForm((f) => ({ ...f, volumenEstimado: e.target.value }))}
                      placeholder="Cuéntanos sobre tus necesidades de volumen, frecuencia, tipo de café que buscas..."
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-2.5 text-sm focus:border-gold-500/60 focus:outline-none transition-colors resize-none"
                    />
                  </div>

                  {error && <p className="text-red-400 text-sm">{error}</p>}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary w-full text-base py-3 disabled:opacity-50"
                  >
                    {submitting ? 'Enviando...' : 'Enviar solicitud'}
                  </button>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
