import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PageMeta } from '../hooks/usePageMeta';
import { usersApi } from '../api';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await usersApi.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setError(err?.response?.data?.error || 'No encontramos una cuenta con ese correo.');
      } else {
        setError(err?.response?.data?.error || 'Error al enviar el correo. Intenta más tarde.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-coffee-50 dark:bg-coffee-950 px-4">
      <PageMeta title="Olvidé mi Contraseña" />
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-2 text-coffee-500 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream text-sm mb-8 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Volver a iniciar sesión
        </Link>

        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
          {submitted ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Revisa tu correo</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm leading-relaxed">
                Si existe una cuenta con <strong className="text-coffee-800 dark:text-coffee-200">{email}</strong>,
                recibirás un enlace para restablecer tu contraseña en unos minutos.
              </p>
              <p className="text-coffee-500 dark:text-coffee-500 text-xs mt-4">¿No recibiste el correo? Revisa tu bandeja de spam.</p>
              <div className="flex flex-col gap-3 mt-6">
                <button
                  onClick={async () => {
                    const btn = document.activeElement as HTMLButtonElement;
                    btn!.disabled = true;
                    try {
                      await usersApi.forgotPassword(email);
                      btn!.textContent = '¡Reenviado!';
                    } catch { btn!.disabled = false; }
                  }}
                  className="text-xs text-gold-500 hover:text-gold-400 underline transition-colors"
                >
                  Reenviar enlace
                </button>
                <Link to="/login" className="text-xs text-coffee-500 hover:text-coffee-900 dark:hover:text-cream transition-colors">
                  Volver a iniciar sesión
                </Link>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Olvidé mi contraseña</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                Ingresa tu email y te enviaremos un enlace para restablecerla.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                    <input
                      ref={emailRef}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@email.com"
                      autoFocus
                      className="w-full pl-10 bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-600 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>
                {error && <p className="text-red-500 text-xs">{error}</p>}
                <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
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
