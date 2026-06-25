import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { PageMeta } from '../hooks/usePageMeta';
import { usersApi } from '../api';
import { Lock, CheckCircle, AlertCircle } from 'lucide-react';

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
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Error al restablecer la contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-coffee-50 dark:bg-coffee-950 px-4">
      <PageMeta title="Restablecer Contraseña" />
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
          {success ? (
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Contraseña actualizada</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">Serás redirigido al inicio de sesión…</p>
              <div className="flex flex-col gap-3">
                <Link to="/login" className="btn-primary inline-block">Ir a iniciar sesión ahora</Link>
                <span className="text-coffee-400 text-xs">Redirigiendo automáticamente en 3 segundos…</span>
              </div>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Nueva contraseña</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">Ingresa tu nueva contraseña.</p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1">Nueva contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      className="w-full pl-10 bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-600 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-widest mb-1">Confirmar contraseña</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-400" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repite la contraseña"
                      className="w-full pl-10 bg-white dark:bg-coffee-800 border border-coffee-300 dark:border-coffee-600 text-coffee-900 dark:text-cream px-3 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
                    />
                  </div>
                  {confirm.length > 0 && (
                    <p className={`flex items-center gap-1 text-xs mt-1 ${password === confirm ? 'text-green-500' : 'text-red-500'}`}>
                      {password === confirm ? (
                        <><CheckCircle className="w-3 h-3" /> Coinciden</>
                      ) : (
                        <><AlertCircle className="w-3 h-3" /> No coinciden</>
                      )}
                    </p>
                  )}
                </div>
                {error && (
                  <div className="flex items-start gap-2 text-red-500 text-xs">
                    <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <button type="submit" disabled={loading} className="w-full btn-primary disabled:opacity-50">
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
