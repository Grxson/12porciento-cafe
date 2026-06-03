import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { CreditCard, Trash2, Plus, CheckCircle } from 'lucide-react';
import { usersApi } from '../../api';
import { useUser } from '../../context/UserContext';
import { useToast } from '../../context/ToastContext';
import type { PaymentMethod as PM } from '../../types';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '14px',
      color: '#f5ede3',
      fontFamily: 'Karla, sans-serif',
      '::placeholder': { color: '#6b4f3a' },
    },
    invalid: { color: '#ef4444' },
  },
};

function AddCardForm({ clientSecret, onSuccess, onCancel }: { clientSecret: string; onSuccess: () => void; onCancel: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const { add } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    try {
      const card = elements.getElement(CardElement);
      if (!card) return;
      const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card },
      });
      if (error) { add(error.message ?? 'Error al guardar tarjeta', 'error'); return; }
      if (setupIntent?.payment_method) {
        await usersApi.setDefaultPaymentMethod(setupIntent.payment_method as string);
        add('Tarjeta guardada', 'success');
        onSuccess();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-coffee-800 border border-coffee-700 p-4">
        <CardElement options={CARD_STYLE} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={!stripe || saving}
          className="btn-primary flex items-center gap-2 disabled:opacity-50">
          <CheckCircle className="w-4 h-4" />
          {saving ? 'Guardando...' : 'Guardar tarjeta'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-sm text-coffee-400 hover:text-cream border border-coffee-700 px-4 py-2 transition-colors">
          Cancelar
        </button>
      </div>
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
      .catch(() => add('Error al iniciar configuración', 'error'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>;

  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <AddCardForm clientSecret={clientSecret} onSuccess={onSuccess} onCancel={onCancel} />
    </Elements>
  );
}

const BRAND_LABELS: Record<string, string> = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex',
  discover: 'Discover', jcb: 'JCB', unionpay: 'UnionPay', unknown: 'Tarjeta',
};

export default function PaymentMethod() {
  const user = useUser((s) => s.user);
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
      .catch(() => {})
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
    await usersApi.setDefaultPaymentMethod(pmId);
    setDefaultId(pmId);
    await refreshUser();
    add('Tarjeta predeterminada actualizada', 'success');
  };

  if (loading) return <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
      <h2 className="font-serif text-2xl text-cream mb-2">Método de pago</h2>
      <p className="text-coffee-500 text-sm mb-6">Tu tarjeta guardada se usará en futuros pedidos.</p>

      {methods.length > 0 && (
        <div className="space-y-3 mb-6">
          {methods.map((pm) => (
            <div key={pm.id} className={`flex items-center justify-between p-4 border transition-colors ${
              defaultId === pm.id ? 'border-gold-500/50 bg-gold-500/5' : 'border-coffee-800 bg-coffee-900'
            }`}>
              <div className="flex items-center gap-3">
                <CreditCard className={`w-5 h-5 ${defaultId === pm.id ? 'text-gold-500' : 'text-coffee-500'}`} />
                <div>
                  <p className="text-cream text-sm font-medium">
                    {BRAND_LABELS[pm.brand] ?? pm.brand} •••• {pm.last4}
                  </p>
                  <p className="text-coffee-500 text-xs">Vence {pm.expMonth.toString().padStart(2, '0')}/{pm.expYear}</p>
                </div>
                {defaultId === pm.id && (
                  <span className="text-[10px] text-gold-500 border border-gold-500/30 px-2 py-0.5 uppercase tracking-wider">Predeterminada</span>
                )}
              </div>
              <div className="flex gap-2">
                {defaultId !== pm.id && (
                  <button onClick={() => handleSetDefault(pm.id)}
                    className="text-xs text-coffee-400 hover:text-gold-500 transition-colors">
                    Predeterminar
                  </button>
                )}
                <button onClick={() => handleDelete(pm.id)} disabled={deleting === pm.id}
                  className="text-coffee-500 hover:text-red-400 transition-colors disabled:opacity-50">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {methods.length === 0 && !adding && (
        <div className="text-center py-8 bg-coffee-900 border border-coffee-800 mb-6">
          <CreditCard className="w-10 h-10 text-coffee-700 mx-auto mb-3" />
          <p className="text-coffee-500 text-sm">Sin tarjetas guardadas</p>
        </div>
      )}

      {adding ? (
        <div className="bg-coffee-900 border border-coffee-800 p-5">
          <h3 className="font-serif text-lg text-cream mb-4">Agregar tarjeta</h3>
          <AddCardWithSetup
            onSuccess={() => { setAdding(false); load(); refreshUser(); }}
            onCancel={() => setAdding(false)}
          />
        </div>
      ) : (
        <button onClick={() => setAdding(true)}
          className="flex items-center gap-2 text-sm text-gold-500 hover:text-gold-400 border border-gold-500/30 hover:border-gold-500/60 px-4 py-2.5 transition-colors">
          <Plus className="w-4 h-4" /> Agregar tarjeta
        </button>
      )}
    </motion.div>
  );
}
