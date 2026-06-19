import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Trash2, Plus, CheckCircle, ShieldCheck } from 'lucide-react';
import { usersApi } from '../../api';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import type { PaymentMethod as PM } from '../../types';
import { PageMeta } from '../../hooks/usePageMeta';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const ELEMENTS_APPEARANCE = {
  theme: 'night' as const,
  variables: {
    colorPrimary: '#c9a227',
    colorBackground: '#1a0e07',
    colorText: '#f5ede3',
    colorDanger: '#ef4444',
    fontFamily: 'Karla, sans-serif',
    borderRadius: '0px',
    fontSizeBase: '14px',
  },
  rules: {
    '.Input': { border: '1px solid #2a1a0e', padding: '12px 14px' },
    '.Input:focus': { border: '1px solid #c9a227', boxShadow: 'none' },
    '.Label': { fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8c6a4a' },
    '.Tab': { border: '1px solid #2a1a0e', backgroundColor: '#1a0e07' },
    '.Tab--selected': { border: '1px solid #c9a227', backgroundColor: '#1a0e07' },
  },
};

function AddCardForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { add } = useToast();
  const [saving, setSaving] = useState(false);
  const [ready, setReady] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const { error, setupIntent } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (error) { add(error.message ?? 'Error al guardar tarjeta', 'error'); return; }
      if (setupIntent?.payment_method) {
        await usersApi.setDefaultPaymentMethod(setupIntent.payment_method as string);
        add('Tarjeta guardada exitosamente', 'success');
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <PaymentElement
        onReady={() => setReady(true)}
        options={{ layout: 'tabs' }}
      />
      {ready && (
        <>
          <div className="flex items-center gap-2 text-coffee-500 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-green-500" />
            Datos cifrados · Procesado por Stripe
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={!stripe || saving}
              className="btn-primary flex items-center gap-2 disabled:opacity-50">
              <CheckCircle className="w-4 h-4" />
              {saving ? 'Guardando...' : 'Guardar método de pago'}
            </button>
            <button type="button" onClick={onCancel}
              className="text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream border border-coffee-200 dark:border-coffee-700 px-4 py-2 min-h-[44px] transition-colors">
              Cancelar
            </button>
          </div>
        </>
      )}
      {!ready && (
        <div className="flex justify-center py-4">
          <div className="w-5 h-5 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
        </div>
      )}
    </form>
  );
}

function AddCardWithSetup({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [clientSecret, setClientSecret] = useState('');
  const [loading, setLoading] = useState(true);
  const { add } = useToast();

  useEffect(() => {
    usersApi.setupPaymentMethod()
      .then((r) => setClientSecret(r.data.clientSecret))
      .catch(() => add('Error al iniciar configuración de pago', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex justify-center py-10">
      <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  );

  if (!clientSecret) return null;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: ELEMENTS_APPEARANCE }}>
      <AddCardForm clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'American Express',
  discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay', unknown: 'Tarjeta',
};

const BRAND_COLORS: Record<string, string> = {
  visa: 'text-blue-400', mastercard: 'text-orange-400',
  amex: 'text-sky-400', discover: 'text-amber-400',
};

export default function PaymentMethod() {
  const refreshUser = useUser((s) => s.refresh);
  const { add } = useToast();
  const [methods, setMethods] = useState<PM[]>([]);
  const [defaultId, setDefaultId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    usersApi.listPaymentMethods()
      .then((r) => { setMethods(r.data.methods); setDefaultId(r.data.defaultId); })
      .catch(() => { add('Error al cargar métodos de pago', 'error'); })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const handleDelete = async (pmId: string) => {
    setDeleting(pmId);
    try {
      await usersApi.deletePaymentMethod(pmId);
      add('Tarjeta eliminada', 'success');
      load();
      await refreshUser();
    } catch { add('Error al eliminar', 'error'); }
    finally { setDeleting(null); }
  };

  const handleSetDefault = async (pmId: string) => {
    try {
      await usersApi.setDefaultPaymentMethod(pmId);
      setDefaultId(pmId);
      await refreshUser();
      add('Tarjeta predeterminada actualizada', 'success');
    } catch {
      add('Error al actualizar tarjeta predeterminada', 'error');
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <PageMeta title="Métodos de Pago" />
      <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
      <PageMeta title="Métodos de Pago" />
      <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-1">Método de pago</h2>
      <p className="text-coffee-500 text-sm mb-6">
        Tu tarjeta guardada se usará en futuros pedidos. Puedes cambiarla o eliminarla en cualquier momento.
      </p>

      {methods.length > 0 && (
        <div className="space-y-3 mb-6">
          {methods.map((pm) => (
            <div key={pm.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 border transition-all ${
              defaultId === pm.id
                ? 'border-gold-500/60 bg-gold-500/5 shadow-[0_0_20px_rgba(201,169,110,0.05)]'
                : 'border-coffee-200 dark:border-coffee-800 bg-white dark:bg-coffee-900 hover:border-coffee-300 dark:hover:border-coffee-700'
            }`}>
              <div className="flex items-center gap-3 min-w-0">
                <div className={`w-8 h-8 flex items-center justify-center shrink-0 ${BRAND_COLORS[pm.brand] ?? 'text-coffee-400'}`}>
                  <CreditCard className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
                      {BRAND_LABELS[pm.brand] ?? pm.brand} •••• {pm.last4}
                    </p>
                    {defaultId === pm.id && (
                      <span className="text-[9px] text-gold-500 border border-gold-500/40 px-1.5 py-0.5 uppercase tracking-wider shrink-0">
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-coffee-500 text-xs">
                    Vence {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {defaultId !== pm.id && (
                  <button onClick={() => handleSetDefault(pm.id)}
                    className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-gold-500 min-h-[44px] transition-colors">
                    Usar como predeterminada
                  </button>
                )}
                <button onClick={() => handleDelete(pm.id)} disabled={deleting === pm.id}
                  className="text-coffee-600 hover:text-red-400 transition-colors disabled:opacity-50 p-1 min-h-[44px]">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {methods.length === 0 && !adding && (
        <div className="text-center py-10 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 mb-6">
          <CreditCard className="w-10 h-10 text-coffee-400 dark:text-coffee-700 mx-auto mb-3" />
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-1">Sin tarjetas guardadas</p>
          <p className="text-coffee-500 dark:text-coffee-600 text-xs">Agrega una para pagar más rápido.</p>
        </div>
      )}

      {adding ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6"
        >
          <h3 className="font-serif text-lg text-coffee-900 dark:text-cream mb-5">Agregar método de pago</h3>
          <AddCardWithSetup
            onSuccess={() => { setAdding(false); load(); refreshUser(); }}
            onCancel={() => setAdding(false)}
          />
        </motion.div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 hover:border-gold-500/60 px-5 py-3 min-h-[44px] transition-colors">
          <Plus className="w-4 h-4" />
          Agregar tarjeta
        </button>
      )}
    </motion.div>
  );
}
