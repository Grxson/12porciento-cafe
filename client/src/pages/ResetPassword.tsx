import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageMeta } from '../hooks/usePageMeta';
import { usersApi } from '../api';
import { CheckCircle, AlertCircle } from 'lucide-react';
import PasswordField from '../components/PasswordField';
import { getApiError } from '../lib/api-error';

export default function ResetPassword() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError('Las contraseñas no coinciden');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (!token) {
      setError('Token inválido');
      return;
    }
    setLoading(true);
    try {
      await usersApi.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al restablecer la contraseña'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <PageMeta title="Restablecer Contraseña" />
      <div className="w-full max-w-md">
        <div className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">
                Contraseña actualizada
              </h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                Serás redirigido al inicio de sesión…
              </p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="btn-primary inline-block">
                  Ir a iniciar sesión ahora
                </Link>
                <span className="text-coffee-400 dark:text-coffee-500 text-xs">
                  Redirigiendo automáticamente en 3 segundos…
                </span>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">
                Nueva contraseña
              </h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                Ingresa tu nueva contraseña.
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <PasswordField
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  label="Nueva contraseña"
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  showStrength
                  autoFocus
                  confirmValue={confirm}
                  onConfirmChange={(e) => setConfirm(e.target.value)}
                  confirmLabel="Confirmar contraseña"
                  confirmPlaceholder="Repite la contraseña"
                  id="reset-password"
                  confirmId="reset-confirm-password"
                />
                {error && (
                  <div role="alert" className="flex items-start gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full btn-primary disabled:opacity-50"
                >
                  {loading ? 'Actualizando…' : 'Actualizar contraseña'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
