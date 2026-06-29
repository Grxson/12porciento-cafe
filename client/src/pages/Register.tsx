import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { mexicanStates } from '../constants/mexico';
import { PageMeta } from '../hooks/usePageMeta';
import PasswordField from '../components/PasswordField';
import { getApiError } from '../lib/api-error';

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [address, setAddress] = useState({ phone: '', address: '', city: '', state: '', zipCode: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const register = useUser((s) => s.register);
  const updateProfile = useUser((s) => s.updateProfile);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true); setError('');
    try {
      await register(form.name, form.email, form.password);
      setStep(2);
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al crear cuenta'));
    } finally {
      setLoading(false);
    }
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(address);
    } catch { /* non-blocking */ }
    navigate(params.get('redirect') ?? '/', { replace: true });
  };

  const handleSkip = () => navigate(params.get('redirect') ?? '/', { replace: true });

  return (
    <div className="min-h-screen pt-20 flex items-center justify-center px-4 bg-coffee-50 dark:bg-coffee-950">
      <PageMeta title="Crear Cuenta" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-10">
          <div className="font-serif text-5xl font-black text-coffee-900 dark:text-cream">12%</div>
          <div className="text-xs tracking-widest text-gold-500 uppercase mt-1">
            {step === 1 ? 'nueva cuenta' : 'dirección de envío'}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                step > n ? 'bg-gold-500 text-coffee-950' : step === n ? 'bg-gold-500 text-coffee-950' : 'bg-coffee-200 dark:bg-coffee-800 text-coffee-500'
              }`}>
                {step > n ? <Check className="w-3 h-3" /> : n}
              </div>
              {n < 2 && <ChevronRight className="w-3 h-3 text-coffee-400 dark:text-coffee-700" />}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {step === 1 ? (
            <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
                <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">Crear cuenta</h1>
                <form onSubmit={handleStep1} className="space-y-4">
                  {[
                    { name: 'name', label: 'Nombre completo', type: 'text', placeholder: 'Tu nombre', autoComplete: 'name' },
                    { name: 'email', label: 'Email', type: 'email', placeholder: 'tu@email.com', autoComplete: 'email' },
                  ].map(({ name, label, type, placeholder, autoComplete }) => (
                    <div key={name}>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">{label}</label>
                      <input
                        name={name} type={type} required
                        value={form[name as keyof typeof form]} onChange={handleChange}
                        autoComplete={autoComplete}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:border-gold-500/60 focus:outline-none transition-colors"
                        placeholder={placeholder}
                      />
                    </div>
                  ))}
                  <PasswordField
                    value={form.password}
                    onChange={handleChange}
                    label="Contraseña"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    name="password"
                    showStrength
                  />
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {loading ? 'Creando cuenta...' : <><span>Continuar</span><ChevronRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
              <p className="text-coffee-500 text-sm text-center mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-gold-500 hover:text-gold-400 transition-colors">Iniciar sesión</Link>
              </p>
            </motion.div>
          ) : (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
                <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">Dirección de envío</h2>
                <p className="text-coffee-500 text-xs mb-6">Para recibir tus pedidos y suscripciones.</p>
                <form onSubmit={handleStep2} className="space-y-4">
                  <div>
                    <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Teléfono</label>
                    <input name="phone" type="tel" value={address.phone} onChange={handleAddressChange}
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none"
                      placeholder="55 1234 5678" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Calle y número *</label>
                    <input name="address" required value={address.address} onChange={handleAddressChange}
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none"
                      placeholder="Calle, número, colonia" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Ciudad *</label>
                      <input name="city" required value={address.city} onChange={handleAddressChange}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">CP *</label>
                      <input name="zipCode" required value={address.zipCode} onChange={handleAddressChange}
                        className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-sm focus:border-gold-500/60 focus:outline-none"
                        placeholder="12345" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-2">Estado *</label>
                    <select name="state" required value={address.state} onChange={handleAddressChange}
                      className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream px-4 py-3 text-base min-h-[48px] focus:border-gold-500/60 focus:outline-none">
                      <option value="">Seleccionar</option>
                      {mexicanStates.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <button type="submit" disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2">
                    <Check className="w-4 h-4" />
                    {loading ? 'Guardando...' : 'Guardar y entrar'}
                  </button>
                </form>
              </div>
              <button onClick={handleSkip} className="text-coffee-600 text-xs text-center mt-4 w-full hover:text-coffee-400 transition-colors">
                Omitir por ahora
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
