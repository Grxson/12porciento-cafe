import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import { PageMeta } from '../hooks/usePageMeta';
import PasswordField from '../components/PasswordField';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const login = useUser((s) => s.login);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(email, password);
      navigate(params.get('redirect') ?? '/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-coffee-50 dark:bg-coffee-950">
      <PageMeta title="Iniciar Sesión" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-coffee-900 dark:text-cream">12%</div>
          <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase mt-1">mi cuenta</div>
        </div>

        <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
          <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Iniciar sesión</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:border-gold-500/60 focus:outline-none transition-colors"
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
            />
            <div className="flex justify-end">
              <Link to="/olvide-contrasena" className="text-xs text-coffee-500 dark:text-coffee-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors">
                Olvidé mi contraseña
              </Link>
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
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
