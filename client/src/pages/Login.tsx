import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { PageMeta } from '../hooks/usePageMeta';
import PasswordField from '../components/PasswordField';
import { getApiError } from '../lib/api-error';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useUser((s) => s.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(params.get('redirect') ?? '/', { replace: true });
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <PageMeta title="Iniciar Sesión" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="mb-6 text-center sm:mb-10">
          <div className="font-serif text-4xl font-black text-coffee-900 dark:text-cream sm:text-5xl">
            12%
          </div>
          <div className="text-xs tracking-widest text-gold-500 uppercase mt-1">mi cuenta</div>
        </div>

        <div className="border border-coffee-200 bg-coffee-100 p-5 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
          <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">
            Iniciar sesión
          </h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-email" className="field-label">
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="field-control"
                placeholder="tu@email.com"
              />
            </div>
            <PasswordField
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              label="Contraseña"
              placeholder="••••••••"
              autoComplete="current-password"
              showStrength={false}
              id="login-password"
            />
            <div className="flex justify-end">
              <Link
                to="/olvide-contrasena"
                className="inline-flex min-h-11 items-center text-xs text-coffee-500 transition-colors hover:text-gold-500 dark:text-coffee-400 dark:hover:text-gold-400"
              >
                Olvidé mi contraseña
              </Link>
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

        <p className="text-coffee-500 text-sm text-center mt-6">
          ¿Sin cuenta?{' '}
          <Link to="/registro" className="text-gold-500 hover:text-gold-400 transition-colors">
            Crear cuenta
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
