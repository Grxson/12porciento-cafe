import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import { usersApi } from '../api';
import { getApiError } from '../lib/api-error';
import { PageMeta } from '../hooks/usePageMeta';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Token no proporcionado.');
      return;
    }
    usersApi.verifyEmail(token)
      .then((res: { data: { message?: string } }) => {
        setStatus('success');
        setMessage(res.data.message || 'Correo verificado correctamente.');
      })
      .catch((err: unknown) => {
        setStatus('error');
        setMessage(getApiError(err, 'Error al verificar el correo. El enlace puede haber expirado.'));
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-coffee-50 dark:bg-coffee-950 px-4">
      <PageMeta title="Verificar Correo" />
      <div className="w-full max-w-md text-center">
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-8">
          {status === 'loading' && (
            <>
              <Loader2 className="w-12 h-12 text-gold-500 mx-auto mb-4 animate-spin" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Verificando...</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm">Un momento por favor</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">Correo verificado!</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">{message}</p>
              <Link
                to="/perfil/configuracion"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold text-sm hover:bg-gold-400 transition-colors"
              >
                Ir a mi perfil
              </Link>
            </>
          )}
          {status === 'error' && (
            <>
              <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
              <h1 className="text-xl font-semibold text-coffee-900 dark:text-cream mb-2">No se pudo verificar</h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">{message}</p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/perfil/configuracion"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-gold-500 text-coffee-950 font-semibold text-sm hover:bg-gold-400 transition-colors"
                >
                  <Mail className="w-4 h-4" /> Reenviar email de verificacion
                </Link>
                <Link
                  to="/"
                  className="text-coffee-500 dark:text-coffee-400 text-sm hover:text-coffee-700 dark:hover:text-cream transition-colors"
                >
                  Volver al inicio
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
