import { useState } from 'react';
import { Mail, X, Loader2 } from 'lucide-react';
import { usersApi } from '../api';
import { useToast } from '../context/ToastContext';

interface EmailVerificationBannerProps {
  email: string;
  onVerified?: () => void;
}

export default function EmailVerificationBanner({ email }: EmailVerificationBannerProps) {
  const [loading, setLoading] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { add: addToast } = useToast();

  if (dismissed) return null;

  const handleResend = async () => {
    setLoading(true);
    try {
      await usersApi.resendVerification();
      addToast('Email de verificacion reenviado. Revisa tu bandeja.', 'success');
    } catch {
      addToast('Error al reenviar. Intenta mas tarde.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700/40 rounded-lg p-4 mb-6">
      <div className="flex items-start gap-3">
        <Mail className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
            Verifica tu correo electronico
          </p>
          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5">
            Enviamos un enlace de verificacion a <strong>{email}</strong>.
            Algunas funciones requieren email verificado.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleResend}
            disabled={loading}
            className="text-xs text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Reenviar'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 p-1"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
