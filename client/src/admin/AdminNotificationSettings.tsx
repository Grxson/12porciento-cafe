import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, Send } from 'lucide-react';
import api from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import { PageMeta } from '../hooks/usePageMeta';

const EVENT_TYPES = [
  { value: 'new_order', label: 'Nuevo pedido' },
  { value: 'order_status_changed', label: 'Estado de pedido' },
  { value: 'new_review', label: 'Nueva reseña' },
  { value: 'review_approved', label: 'Reseña aprobada' },
  { value: 'new_reply', label: 'Nueva respuesta' },
  { value: 'subscription_created', label: 'Suscripción creada' },
  { value: 'subscription_cancelled', label: 'Suscripción cancelada' },
  { value: 'low_stock', label: 'Stock bajo' },
];

export default function AdminNotificationSettings() {
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    api.get('/push/preferences')
      .then((res) => setPreferences(res.data.preferences))
      .catch(() => setError('Error al cargar preferencias'))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = useCallback((eventType: string) => {
    setPreferences((p) => ({ ...p, [eventType]: !p[eventType] }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/push/preferences/bulk', { preferences });
      setDirty(false);
    } catch {
      setError('Error al guardar preferencias');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestSending(true);
    setTestResult(null);
    try {
      const res = await api.post('/push/test');
      setTestResult(res.data);
    } catch {
      setError('Error al enviar notificación de prueba');
    } finally {
      setTestSending(false);
    }
  };

  if (loading) {
    return <AdminSkeleton rows={4} />;
  }

  return (
    <div className="p-8">
      <PageMeta title="Notificaciones" noSuffix />
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-gold-500" />
        <div>
          <h1 className="text-2xl font-bold text-coffee-900 dark:text-cream">Notificaciones</h1>
          <p className="text-sm text-coffee-500 dark:text-coffee-400 mt-0.5">Controla qué eventos generan notificaciones push en tus dispositivos suscritos.</p>
        </div>
      </div>

      {error && <AdminErrorState error={error} />}

      <div className="space-y-2 mb-8">
        {EVENT_TYPES.map(({ value, label }) => (
          <label
            key={value}
            className={`flex items-center gap-3 p-3 border cursor-pointer transition-colors ${
              preferences[value] === true
                ? 'bg-coffee-50 dark:bg-coffee-900 border-coffee-200 dark:border-coffee-700'
                : 'bg-coffee-100/50 dark:bg-coffee-950/50 border-coffee-200/50 dark:border-coffee-800/50'
            }`}
          >
            <input
              type="checkbox"
              checked={preferences[value] === true}
              onChange={() => handleToggle(value)}
              className="w-4 h-4 accent-gold-500"
            />
            <span className={`flex-1 text-sm ${preferences[value] === true ? 'text-coffee-900 dark:text-cream' : 'text-coffee-500 dark:text-coffee-500'}`}>
              {label}
            </span>
            {preferences[value] === true && <span className="w-3.5 h-3.5 rounded-full bg-green-500 dark:bg-green-400" />}
          </label>
        ))}
      </div>

      <div className="mb-8">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Bell className="w-4 h-4" />
          )}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="border-t border-coffee-200 dark:border-coffee-800 pt-6">
        <h3 className="text-sm font-medium text-coffee-900 dark:text-cream mb-3">Probar notificaciones</h3>
        <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-4">Envía una notificación de prueba a todos los dispositivos suscritos.</p>
        <button
          onClick={handleTest}
          disabled={testSending}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-sm font-medium hover:bg-gold-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {testSending ? 'Enviando...' : 'Enviar notificación de prueba'}
        </button>

        {testResult && (
          <div className={`mt-3 text-sm flex items-center gap-2 ${testResult.failed > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}>
            <span>Enviada: {testResult.sent}</span>
            {testResult.failed > 0 && <span>· Falló: {testResult.failed}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
