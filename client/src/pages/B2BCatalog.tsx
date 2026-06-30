import { useState, useEffect } from 'react';
import { Building2, Package, Mail, Phone, User, FileText, CheckCircle } from 'lucide-react';
import { b2bApi } from '../api';
import type { B2BProduct } from '../types';

export default function B2BCatalog() {
  const [products, setProducts] = useState<B2BProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Inquiry form
  const [form, setForm] = useState({
    businessName: '',
    contactoNombre: '',
    contactoEmail: '',
    contactoTelefono: '',
    rfc: '',
    volumenEstimado: '',
    giroNegocio: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    b2bApi
      .catalog()
      .then((res) => setProducts(res.data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.businessName.trim() || !form.contactoEmail.trim()) return;
    setSubmitting(true);
    try {
      await b2bApi.inquiry({ ...form, volumenEstimado: form.volumenEstimado.trim() });
      setSubmitted(true);
    } catch {
      /* error handled by api interceptor */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 space-y-12">
      {/* Hero */}
      <section className="text-center space-y-4 max-w-2xl mx-auto">
        <Building2 className="w-12 h-12 mx-auto text-gold-500" />
        <h1 className="text-3xl md:text-4xl font-bold text-coffee-900 dark:text-cream">
          Café de especialidad para tu empresa
        </h1>
        <p className="text-coffee-600 dark:text-cream/70 text-lg">
          Ofrecemos café de especialidad mexicano con precios preferenciales por volumen. Selección
          directa de fincas en Veracruz y Chiapas.
        </p>
      </section>

      {/* Catalog */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-coffee-900 dark:text-cream">Catálogo B2B</h2>
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
          <p className="text-coffee-500 dark:text-cream/50 text-center py-12">
            No hay productos disponibles
          </p>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-white dark:bg-coffee-900 rounded-xl border border-coffee-100 dark:border-coffee-700 overflow-hidden"
              >
                <button
                  onClick={() => setExpanded(expanded === p.id ? null : p.id)}
                  className="w-full text-left p-4 flex items-center gap-4 hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors"
                >
                  <div className="w-16 h-16 rounded-lg bg-coffee-100 dark:bg-coffee-800 flex-shrink-0 overflow-hidden">
                    {p.imageUrl && (
                      <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium text-coffee-900 dark:text-cream">{p.name}</h3>
                    <p className="text-sm text-coffee-500 dark:text-cream/50 truncate">
                      {p.origin && `${p.origin}`}
                      {p.weight ? ` · ${p.weight}g` : ''}
                      {p.sku ? ` · SKU: ${p.sku}` : ''}
                    </p>
                    <p className="text-xs text-coffee-400 dark:text-cream/40 mt-1">
                      {p.b2bPriceTiers.length} rango{p.b2bPriceTiers.length !== 1 ? 's' : ''} de
                      precio
                    </p>
                  </div>
                </button>

                {expanded === p.id && (
                  <div className="border-t border-coffee-100 dark:border-coffee-700 p-4 bg-coffee-50/50 dark:bg-coffee-950/50 space-y-3">
                    <p className="text-sm text-coffee-600 dark:text-cream/70">{p.description}</p>
                    {p.b2bPriceTiers.length > 0 && (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-xs text-coffee-500 dark:text-cream/50 text-left">
                            <th className="pb-1.5">Cantidad</th>
                            <th className="pb-1.5">Precio por unidad</th>
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
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Inquiry Form */}
      <section className="max-w-xl mx-auto bg-white dark:bg-coffee-900 rounded-2xl border border-coffee-100 dark:border-coffee-700 p-6 md:p-8">
        {submitted ? (
          <div className="text-center py-8 space-y-3">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500" />
            <h3 className="text-lg font-semibold text-coffee-900 dark:text-cream">
              Solicitud recibida
            </h3>
            <p className="text-coffee-600 dark:text-cream/70">
              Te contactaremos en 24-48 horas con una cotización personalizada.
            </p>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">
              Solicitar cotización
            </h2>
            <p className="text-sm text-coffee-500 dark:text-cream/50 mb-6">
              Completa el formulario y te enviaremos precios personalizados.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                  <Building2 className="w-3.5 h-3.5" /> Empresa *
                </label>
                <input
                  required
                  value={form.businessName}
                  onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                    <User className="w-3.5 h-3.5" /> Contacto
                  </label>
                  <input
                    value={form.contactoNombre}
                    onChange={(e) => setForm((f) => ({ ...f, contactoNombre: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                    <Mail className="w-3.5 h-3.5" /> Email *
                  </label>
                  <input
                    required
                    type="email"
                    value={form.contactoEmail}
                    onChange={(e) => setForm((f) => ({ ...f, contactoEmail: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5" /> Teléfono
                  </label>
                  <input
                    value={form.contactoTelefono}
                    onChange={(e) => setForm((f) => ({ ...f, contactoTelefono: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5" /> RFC
                  </label>
                  <input
                    value={form.rfc}
                    onChange={(e) => setForm((f) => ({ ...f, rfc: e.target.value }))}
                    className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm text-coffee-600 dark:text-cream/70 flex items-center gap-1.5 mb-1">
                  <Package className="w-3.5 h-3.5" /> Volumen estimado / Necesidades
                </label>
                <textarea
                  rows={3}
                  value={form.volumenEstimado}
                  onChange={(e) => setForm((f) => ({ ...f, volumenEstimado: e.target.value }))}
                  placeholder="Cuéntanos sobre tus necesidades de volumen, frecuencia, etc."
                  className="w-full border border-coffee-200 dark:border-coffee-600 rounded-lg px-3 py-2 bg-white dark:bg-coffee-800 text-coffee-900 dark:text-cream text-sm resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold-500 text-coffee-950 font-medium py-2.5 rounded-lg hover:bg-gold-400 disabled:opacity-50 transition-colors"
              >
                {submitting ? 'Enviando...' : 'Solicitar cotización'}
              </button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
