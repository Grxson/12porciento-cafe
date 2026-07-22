import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '../hooks/usePageMeta';
import { usersApi } from '../api';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { getApiError, getErrorStatus } from '../lib/api-error';
import FieldError from '../components/FieldError';
import { validate, required, email as emailRule, type ValidationErrors } from '../lib/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const forgotRules = { email: [required('Email requerido'), emailRule()] };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors = validate(forgotRules, { email });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      await usersApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: unknown) {
      if (getErrorStatus(err) === 404) {
        setError(getApiError(err, 'No encontramos una cuenta con ese correo.'));
      } else {
        setError(getApiError(err, 'Error al enviar el correo. Intenta más tarde.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResent(false);
    try {
      await usersApi.forgotPassword(email);
      setResent(true);
    } catch (err: unknown) {
      setError(getApiError(err, 'No pudimos reenviar el enlace.'));
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="auth-shell">
      <PageMeta title="Olvidé mi Contraseña" />
      <div className="w-full max-w-md">
        <Link
          to="/login"
          className="mb-6 inline-flex min-h-11 items-center gap-2 text-sm text-coffee-500 transition-colors hover:text-coffee-900 dark:text-coffee-400 dark:hover:text-cream sm:mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
        </Link>

        <div className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
          {submitted ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">
                Revisa tu correo
              </h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm leading-relaxed">
                Si existe una cuenta con{' '}
                <strong className="text-coffee-800 dark:text-coffee-300">{email}</strong>, recibirás
                un enlace para restablecer tu contraseña en unos minutos.
              </p>
              <p className="text-coffee-500 dark:text-coffee-500 text-xs mt-4">
                ¿No recibiste el correo? Revisa tu bandeja de spam.
              </p>
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="min-h-11 text-xs text-gold-500 underline transition-colors hover:text-gold-400 disabled:opacity-50"
                >
                  {resending ? 'Reenviando…' : resent ? '¡Reenviado!' : 'Reenviar enlace'}
                </button>
                <Link
                  to="/login"
                  className="inline-flex min-h-11 items-center justify-center text-xs text-coffee-500 transition-colors hover:text-coffee-900 dark:hover:text-cream"
                >
                  Volver a iniciar sesión
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">
                Olvidé mi contraseña
              </h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecerla.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="forgot-email" className="field-label">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                    <input
                      id="forgot-email"
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
                      }}
                      placeholder="tu@email.com"
                      autoComplete="email"
                      inputMode="email"
                      autoFocus
                      className={`field-control pl-10 ${fieldErrors.email ? 'border-red-500 dark:border-red-400' : ''}`}
                      aria-invalid={!!fieldErrors.email}
                    />
                    <FieldError message={fieldErrors.email} />
                  </div>
                </div>
                {error && (
                  <p role="alert" className="text-red-500 text-xs">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Enviando…' : 'Enviar enlace'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
