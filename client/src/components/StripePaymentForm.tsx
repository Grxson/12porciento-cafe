import { useState } from 'react';
import { loadStripe, type StripeElementsOptions } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { friendlyStripeError } from '../services/paymentRetry';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface Props {
  clientSecret: string;
  amount: number;
  returnUrl: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

function PaymentFormInner({ amount, returnUrl, onSuccess, onError }: Omit<Props, 'clientSecret'>) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setLoading(true);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });

    setLoading(false);

    if (error) {
      onError(friendlyStripeError(error));
      return;
    }
    // A missing error does NOT mean the payment succeeded — some payment
    // methods return without error while still 'processing' or stuck in
    // another non-final state. Only a confirmed 'succeeded' status may
    // trigger order creation; anything else must not be treated as success.
    if (paymentIntent?.status === 'succeeded') {
      onSuccess();
    } else if (paymentIntent?.status === 'processing') {
      onError('Tu pago está siendo procesado. Te avisaremos por correo cuando se confirme.');
    } else {
      onError('No se pudo confirmar el pago. Intenta de nuevo.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 p-4 rounded-sm">
        <PaymentElement
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      <div className="flex items-center gap-2 text-coffee-600 dark:text-coffee-400 text-xs">
        <Lock className="w-3.5 h-3.5 text-gold-500 shrink-0" />
        Pago seguro procesado por Stripe. No almacenamos datos de tarjeta.
      </div>

      <button
        type="submit"
        disabled={!stripe || !elements || loading}
        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Procesando...' : `Pagar $${amount.toLocaleString('es-MX')} MXN`}
      </button>
    </form>
  );
}

export default function StripePaymentForm({
  clientSecret,
  amount,
  returnUrl,
  onSuccess,
  onError,
}: Props) {
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
      <PaymentFormInner
        amount={amount}
        returnUrl={returnUrl}
        onSuccess={onSuccess}
        onError={onError}
      />
    </Elements>
  );
}
