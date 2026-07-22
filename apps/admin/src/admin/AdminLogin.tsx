import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../api';
import { PageMeta } from '../hooks/usePageMeta';
import { getApiError } from '@12porciento/shared';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('admin_token')) navigate('/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email requerido';
    if (!password) errs.password = 'Contraseña requerida';
    setFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('admin_token', res.data.token);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getApiError(err, 'Credenciales inválidas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4 pt-[var(--app-safe-top)]">
      <PageMeta title="Admin — Iniciar Sesión" noSuffix />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-coffee-900 dark:text-cream">12%</div>
          <div className="text-xs tracking-widest text-gold-500 uppercase">administración</div>
        </div>

        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
          <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">
            Iniciar sesión
          </h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-login-email"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
              >
                Email
              </label>
              <input
                id="admin-login-email"
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setFieldErrors((p) => ({ ...p, email: '' }));
                }}
                className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:outline-none transition-colors ${fieldErrors.email ? 'border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500/60'}`}
                aria-invalid={!!fieldErrors.email}
                placeholder="admin@12porciento.com"
                autoComplete="username"
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.email}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="admin-login-password"
                className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2"
              >
                Contraseña
              </label>
              <input
                id="admin-login-password"
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setFieldErrors((p) => ({ ...p, password: '' }));
                }}
                className={`w-full bg-white dark:bg-coffee-800 border text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:outline-none transition-colors ${fieldErrors.password ? 'border-red-500' : 'border-coffee-200 dark:border-coffee-700 focus:border-gold-500/60'}`}
                aria-invalid={!!fieldErrors.password}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-500 mt-1">{fieldErrors.password}</p>
              )}
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
