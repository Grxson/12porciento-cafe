import { useState } from 'react';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Gift, ChevronLeft, Check, Copy, Lock, Send } from 'lucide-react';
import { paymentsApi, giftCardsApi } from '../api';
import { useUser } from '../context/UserContext';
import { friendlyStripeError } from '../services/paymentRetry';
import { PageMeta } from '../hooks/usePageMeta';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

type Step = 'form' | 'payment' | 'success';

export default function GiftCardPurchase() {
  const user = useUser((s) => s.user);

  const [step, setStep] = useState<Step>('form');
  const [amount, setAmount] = useState(200);
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [senderName, setSenderName] = useState(user?.name || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [paymentIntentId, setPaymentIntentId] = useState('');
  const [giftCode, setGiftCode] = useState('');
  const [showAmount, setShowAmount] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleCreatePayment = async () => {
    if (!recipientEmail) {
      setError('El email del destinatario es obligatorio');
      return;
    }
    if (amount < 50 || amount > 5000) {
      setError('El monto debe ser entre $50 y $5,000 MXN');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await paymentsApi.createGiftIntent(amount);
      setClientSecret(res.data.clientSecret);
      setPaymentIntentId(res.data.paymentIntentId);
      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async () => {
    setLoading(true);
    try {
      const res = await giftCardsApi.purchase({
        amount,
        recipientName: recipientName || undefined,
        recipientEmail,
        senderName: senderName || user?.name || undefined,
        message: message || undefined,
        paymentIntentId,
      });
      setGiftCode(res.data.data.code);
      setShowAmount(amount);
      setStep('success');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al registrar la gift card. Contacta soporte.');
    } finally {
      setLoading(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(giftCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen pt-20 bg-coffee-50 dark:bg-coffee-950 pb-24 md:pb-0">
      <PageMeta title="Gift Card — 12% Café" />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-12">
        {step !== 'success' && (
          <div className="flex items-center gap-3 mb-8">
            <Gift className="w-6 h-6 text-gold-500" />
            <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Gift Card</h1>
          </div>
        )}

        {step === 'form' && (
          <div className="space-y-6">
            <div className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-6">
              <label className="block text-sm font-medium text-coffee-700 dark:text-coffee-300 mb-3">
                Monto: <span className="text-gold-500 font-bold">${amount} MXN</span>
              </label>
              <input
                type="range"
                min={50}
                max={5000}
                step={50}
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full accent-gold-500"
              />
              <div className="flex justify-between text-xs text-coffee-500 mt-1">
                <span>$50</span>
                <span>$5,000</span>
              </div>
            </div>

            <div className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-6 space-y-4">
              <h3 className="text-sm font-medium text-coffee-700 dark:text-coffee-300">Destinatario</h3>
              <input
                type="text"
                placeholder="Nombre del destinatario (opcional)"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm placeholder:text-coffee-400 focus:outline-none focus:border-gold-500"
              />
              <input
                type="email"
                placeholder="Email del destinatario *"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm placeholder:text-coffee-400 focus:outline-none focus:border-gold-500"
                required
              />
            </div>

            <div className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-6 space-y-4">
              <h3 className="text-sm font-medium text-coffee-700 dark:text-coffee-300">De parte de</h3>
              <input
                type="text"
                placeholder="Tu nombre"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full px-3 py-2.5 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm placeholder:text-coffee-400 focus:outline-none focus:border-gold-500"
              />
              <textarea
                placeholder="Mensaje (opcional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm placeholder:text-coffee-400 focus:outline-none focus:border-gold-500 resize-none"
              />
            </div>

            {error && (
              <p className="text-red-500 text-sm">{error}</p>
            )}

            <button
              onClick={handleCreatePayment}
              disabled={loading || !recipientEmail}
              className="w-full py-3 bg-gold-500 text-coffee-950 font-bold text-sm tracking-widest uppercase hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Procesando...' : `Pagar $${amount} MXN`}
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div>
            <button
              onClick={() => setStep('form')}
              className="flex items-center gap-1 text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream mb-6"
            >
              <ChevronLeft className="w-4 h-4" /> Regresar
            </button>

            <div className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-6 mb-6">
              <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-1">Completar pago</h2>
              <p className="text-sm text-coffee-600 dark:text-coffee-400">
                Gift Card de <strong>${amount} MXN</strong> para {recipientName || recipientEmail}
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-sm mb-4">{error}</p>
            )}

            <GiftCardPaymentForm
              clientSecret={clientSecret}
              amount={amount}
              onSuccess={handlePaymentSuccess}
              onError={(msg) => setError(msg)}
            />
          </div>
        )}

        {step === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
              Gift Card creada
            </h1>
            <p className="text-coffee-600 dark:text-coffee-400 mb-8">
              Tu gift card de <strong>${showAmount} MXN</strong> está lista.
            </p>

            <div className="border border-coffee-200 dark:border-coffee-800 bg-coffee-50 dark:bg-coffee-900/50 p-6 mb-8">
              <p className="text-xs text-coffee-500 uppercase tracking-widest mb-2">Código</p>
              <p className="font-mono text-2xl font-bold text-gold-500 mb-4">{giftCode}</p>

              <div className="flex gap-3">
                <button
                  onClick={copyCode}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-gold-500 text-coffee-950 font-bold text-sm tracking-widest uppercase hover:bg-gold-400 transition-colors"
                >
                  {copied ? <><Check className="w-4 h-4" /> Copiado</> : <><Copy className="w-4 h-4" /> Copiar código</>}
                </button>
              </div>

              {recipientEmail && (
                <div className="flex items-center justify-center gap-2 mt-4 text-sm text-coffee-500">
                  <Send className="w-4 h-4" />
                  <span>Enviado a {recipientEmail}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-coffee-500">
              El destinatario puede usar este código al pagar en nuestra tienda. Válido por 1 año.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GiftCardPaymentFormInner({
  amount,
  onSuccess,
  onError,
}: {
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });

    setLoading(false);

    if (error) {
      onError(friendlyStripeError(error));
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-4">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-coffee-600 dark:text-coffee-400 text-xs">
        <Lock className="w-3.5 h-3.5 text-gold-500 shrink-0" />
        Pago seguro procesado por Stripe.
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="w-full py-3 bg-gold-500 text-coffee-950 font-bold text-sm tracking-widest uppercase hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : `Pagar $${amount.toLocaleString('es-MX')} MXN`}
      </button>
    </form>
  );
}

function GiftCardPaymentForm({
  clientSecret,
  amount,
  onSuccess,
  onError,
}: {
  clientSecret: string;
  amount: number;
  onSuccess: () => void;
  onError: (msg: string) => void;
}) {
  const options: StripeElementsOptions = {
    clientSecret,
    appearance: {
      theme: 'flat',
      variables: {
        colorPrimary: '#c9a96e',
        colorBackground: '#ffffff',
        colorText: '#1a0f0a',
        colorDanger: '#ef4444',
        fontFamily: 'Karla, system-ui, sans-serif',
        borderRadius: '0px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <GiftCardPaymentFormInner amount={amount} onSuccess={onSuccess} onError={onError} />
    </Elements>
  );
}
