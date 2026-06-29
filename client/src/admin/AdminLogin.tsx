import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { authApi } from '../api';
import { PageMeta } from '../hooks/usePageMeta';
import { getApiError } from '../lib/api-error';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (localStorage.getItem('admin_token')) navigate('/admin/dashboard', { replace: true });
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('admin_token', res.data.token);
      navigate('/admin/dashboard', { replace: true });
    } catch (err: unknown) {
      setError(getApiError(err, 'Credenciales inválidas'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
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
          <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Iniciar sesión</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                placeholder="admin@12porciento.com"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Contraseña</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                placeholder="••••••••"
                autoComplete="current-password"
              />
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
