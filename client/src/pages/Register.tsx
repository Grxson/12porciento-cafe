import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ChevronRight, Check } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { mexicanStates } from '../constants/mexico';
import { PageMeta } from '../hooks/usePageMeta';
import PasswordField from '../components/PasswordField';
import { getApiError } from '../lib/api-error';
import { useToast } from '../context/ToastContext';
import FieldError from '../components/FieldError';
import {
  validate,
  required,
  email,
  minLength,
  phone,
  zipCode,
  type ValidationErrors,
} from '../lib/validation';

export default function Register() {
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [address, setAddress] = useState({
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const addToast = useToast((s) => s.add);
  const register = useUser((s) => s.register);
  const updateProfile = useUser((s) => s.updateProfile);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const reduceMotion = useReducedMotion();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setAddress((a) => ({ ...a, [e.target.name]: e.target.value }));

  const step1Rules = {
    name: [required('Nombre requerido')],
    email: [required('Email requerido'), email()],
    password: [required('Contraseña requerida'), minLength(6, 'Mínimo 6 caracteres')],
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(step1Rules, form);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    setError('');
    try {
      await register(form.name, form.email, form.password);
      addToast('Cuenta creada. Completa tu dirección.', 'success');
      setStep(2);
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al crear cuenta'));
    } finally {
      setLoading(false);
    }
  };

  const step2Rules = {
    phone: [phone()],
    address: [required('Dirección requerida')],
    city: [required('Ciudad requerida')],
    zipCode: [required('CP requerido'), zipCode()],
    state: [required('Estado requerido')],
  };

  const handleStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validate(step2Rules, address);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    try {
      await updateProfile(address);
    } catch {
      /* non-blocking */
    }
    navigate(params.get('redirect') ?? '/', { replace: true });
  };

  const handleSkip = () => navigate(params.get('redirect') ?? '/', { replace: true });

  return (
    <div className="auth-shell">
      <PageMeta title="Crear Cuenta" />
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
          <div className="text-xs tracking-widest text-gold-500 uppercase mt-1">
            {step === 1 ? 'nueva cuenta' : 'dirección de envío'}
          </div>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {[1, 2].map((n) => (
            <div key={n} className="flex items-center gap-2">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > n
                    ? 'bg-gold-500 text-coffee-950'
                    : step === n
                      ? 'bg-gold-500 text-coffee-950'
                      : 'bg-coffee-200 dark:bg-coffee-800 text-coffee-500 dark:text-coffee-400'
                }`}
              >
                {step > n ? <Check className="w-3 h-3" /> : n}
              </div>
              {n < 2 && <ChevronRight className="w-3 h-3 text-coffee-400 dark:text-coffee-700" />}
            </div>
          ))}
        </div>

        <AnimatePresence>
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={reduceMotion ? false : { opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: -20 }}
            >
              <div className="border border-coffee-200 bg-coffee-100 p-5 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
                <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-6">
                  Crear cuenta
                </h1>
                <form onSubmit={handleStep1} className="space-y-4">
                  {[
                    {
                      name: 'name',
                      label: 'Nombre completo',
                      type: 'text',
                      placeholder: 'Tu nombre',
                      autoComplete: 'name',
                      id: 'register-name',
                    },
                    {
                      name: 'email',
                      label: 'Email',
                      type: 'email',
                      placeholder: 'tu@email.com',
                      autoComplete: 'email',
                      id: 'register-email',
                    },
                  ].map(({ name, label, type, placeholder, autoComplete, id }) => (
                    <div key={name}>
                      <label htmlFor={id} className="field-label">
                        {label}
                      </label>
                      <input
                        id={id}
                        name={name}
                        type={type}
                        required
                        value={form[name as keyof typeof form]}
                        onChange={(e) => {
                          handleChange(e);
                          if (formErrors[name]) setFormErrors((p) => ({ ...p, [name]: undefined }));
                        }}
                        autoComplete={autoComplete}
                        className={`field-control ${formErrors[name] ? 'border-red-500 dark:border-red-400' : ''}`}
                        aria-invalid={!!formErrors[name]}
                        placeholder={placeholder}
                      />
                      <FieldError message={formErrors[name]} />
                    </div>
                  ))}
                  <PasswordField
                    value={form.password}
                    onChange={(e) => {
                      handleChange(e);
                      if (formErrors.password)
                        setFormErrors((p) => ({ ...p, password: undefined }));
                    }}
                    label="Contraseña"
                    placeholder="Mínimo 6 caracteres"
                    autoComplete="new-password"
                    name="password"
                    showStrength
                    id="register-password"
                    aria-invalid={!!formErrors.password}
                  />
                  <FieldError message={formErrors.password} />
                  {error && <p className="text-red-400 text-sm">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      'Creando cuenta...'
                    ) : (
                      <>
                        <span>Continuar</span>
                        <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
              <p className="text-coffee-500 dark:text-coffee-400 text-sm text-center mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link to="/login" className="text-gold-500 hover:text-gold-400 transition-colors">
                  Iniciar sesión
                </Link>
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={reduceMotion ? false : { opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, x: 20 }}
            >
              <div className="border border-coffee-200 bg-coffee-100 p-5 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
                <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
                  Dirección de envío
                </h2>
                <p className="text-coffee-500 dark:text-coffee-400 text-xs mb-6">
                  Para recibir tus pedidos y suscripciones.
                </p>
                <form onSubmit={handleStep2} className="space-y-4">
                  <div>
                    <label htmlFor="register-phone" className="field-label">
                      Teléfono
                    </label>
                    <input
                      id="register-phone"
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={address.phone}
                      onChange={(e) => {
                        handleAddressChange(e);
                        if (formErrors.phone) setFormErrors((p) => ({ ...p, phone: undefined }));
                      }}
                      className={`field-control ${formErrors.phone ? 'border-red-500 dark:border-red-400' : ''}`}
                      aria-invalid={!!formErrors.phone}
                      placeholder="55 1234 5678"
                    />
                    <FieldError message={formErrors.phone} />
                  </div>
                  <div>
                    <label htmlFor="register-address" className="field-label">
                      Calle y número *
                    </label>
                    <input
                      id="register-address"
                      name="address"
                      autoComplete="street-address"
                      required
                      value={address.address}
                      onChange={(e) => {
                        handleAddressChange(e);
                        if (formErrors.address)
                          setFormErrors((p) => ({ ...p, address: undefined }));
                      }}
                      className={`field-control ${formErrors.address ? 'border-red-500 dark:border-red-400' : ''}`}
                      aria-invalid={!!formErrors.address}
                      placeholder="Calle, número, colonia"
                    />
                    <FieldError message={formErrors.address} />
                  </div>
                  <div className="grid grid-cols-1 gap-3 min-[380px]:grid-cols-2">
                    <div>
                      <label htmlFor="register-city" className="field-label">
                        Ciudad *
                      </label>
                      <input
                        id="register-city"
                        name="city"
                        autoComplete="address-level2"
                        required
                        value={address.city}
                        onChange={(e) => {
                          handleAddressChange(e);
                          if (formErrors.city) setFormErrors((p) => ({ ...p, city: undefined }));
                        }}
                        className={`field-control ${formErrors.city ? 'border-red-500 dark:border-red-400' : ''}`}
                        aria-invalid={!!formErrors.city}
                      />
                      <FieldError message={formErrors.city} />
                    </div>
                    <div>
                      <label htmlFor="register-zipcode" className="field-label">
                        CP *
                      </label>
                      <input
                        id="register-zipcode"
                        name="zipCode"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={5}
                        pattern="[0-9]{5}"
                        required
                        value={address.zipCode}
                        onChange={(e) => {
                          handleAddressChange(e);
                          if (formErrors.zipCode)
                            setFormErrors((p) => ({ ...p, zipCode: undefined }));
                        }}
                        className={`field-control ${formErrors.zipCode ? 'border-red-500 dark:border-red-400' : ''}`}
                        aria-invalid={!!formErrors.zipCode}
                        placeholder="12345"
                      />
                      <FieldError message={formErrors.zipCode} />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="register-state" className="field-label">
                      Estado *
                    </label>
                    <select
                      id="register-state"
                      name="state"
                      autoComplete="address-level1"
                      required
                      value={address.state}
                      onChange={(e) => {
                        handleAddressChange(e);
                        if (formErrors.state) setFormErrors((p) => ({ ...p, state: undefined }));
                      }}
                      className={`field-control ${formErrors.state ? 'border-red-500 dark:border-red-400' : ''}`}
                      aria-invalid={!!formErrors.state}
                    >
                      <option value="">Seleccionar</option>
                      {mexicanStates.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    <FieldError message={formErrors.state} />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    {loading ? 'Guardando...' : 'Guardar y entrar'}
                  </button>
                </form>
              </div>
              <button
                onClick={handleSkip}
                className="mt-4 min-h-11 w-full text-center text-xs text-coffee-600 dark:text-coffee-400 transition-colors hover:text-coffee-400 dark:hover:text-cream"
              >
                Omitir por ahora
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
