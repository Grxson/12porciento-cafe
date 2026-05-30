import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const register = useUser((s) => s.register);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      navigate(params.get('redirect') ?? '/', { replace: true });
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Error al crear cuenta');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-coffee-950">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-cream">12%</div>
          <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase mt-1">nueva cuenta</div>
        </div>

        <div className="bg-coffee-900 border border-coffee-800 p-8">
          <h1 className="font-serif text-2xl text-cream mb-6">Crear cuenta</h1>
          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', autoComplete: 'name' },
              { name: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', autoComplete: 'email' },
              { name: 'password', label: 'Contraseña', type: 'password', placeholder: 'Mínimo 6 caracteres', autoComplete: 'new-password' },
            ].map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-xs text-coffee-400 uppercase tracking-widest mb-2">{label}</label>
                <input
                  name={name} type={type} required
                  value={(form as any)[name]} onChange={handleChange}
                  autoComplete={autoComplete}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none transition-colors"
                  placeholder={placeholder}
                />
              </div>
            ))}
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed">
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-coffee-500 text-sm text-center mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="text-gold-500 hover:text-gold-400 transition-colors">
            Iniciar sesión
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
