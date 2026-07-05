import { useState, useEffect, useCallback } from 'react';
import { Bell, Loader2, Send } from 'lucide-react';
import api from '../api';
import AdminSkeleton from './components/AdminSkeleton';
import AdminErrorState from './components/AdminErrorState';
import ConfirmDialog from './components/ConfirmDialog';
import { useModuleToast } from './context/ModuleContext';
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
  const { addToast } = useModuleToast();
  const [preferences, setPreferences] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<{ sent: number; failed: number } | null>(null);
  const [error, setError] = useState('');
  const [confirmTest, setConfirmTest] = useState(false);

  useEffect(() => {
    setError('');
    api
      .get('/push/preferences')
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
      addToast('Preferencias guardadas', 'success');
    } catch {
      setError('Error al guardar preferencias');
      addToast('Error al guardar preferencias', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTestSending(true);
    setTestResult(null);
    setError('');
    try {
      const res = await api.post('/push/test');
      setTestResult(res.data);
      addToast(`Notificación enviada a ${res.data.sent} dispositivo(s)`, 'success');
    } catch {
      setError('Error al enviar notificación de prueba');
      addToast('Error al enviar notificación de prueba', 'error');
    } finally {
      setTestSending(false);
      setConfirmTest(false);
    }
  };

  if (loading) {
    return <AdminSkeleton rows={4} />;
  }

  return (
    <div>
      <PageMeta title="Notificaciones" noSuffix />
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-5 h-5 text-gold-500" />
        <div>
          <h1 className="font-serif text-3xl text-coffee-900 dark:text-cream">Notificaciones</h1>
          <p className="text-sm text-coffee-500 dark:text-coffee-400 mt-0.5">
            Controla qué eventos generan notificaciones push en tus dispositivos suscritos.
          </p>
        </div>
      </div>

      {error && (
        <AdminErrorState
          error={error}
          onRetry={() => {
            setError('');
            api
              .get('/push/preferences')
              .then((res) => setPreferences(res.data.preferences))
              .catch(() => setError('Error al cargar preferencias'));
          }}
        />
      )}

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
            <span
              className={`flex-1 text-sm ${preferences[value] === true ? 'text-coffee-900 dark:text-cream' : 'text-coffee-500 dark:text-coffee-500'}`}
            >
              {label}
            </span>
            {preferences[value] === true && (
              <span className="w-3.5 h-3.5 rounded-full bg-green-500 dark:bg-green-400" />
            )}
          </label>
        ))}
      </div>

      <div className="mb-8">
        <button
          onClick={handleSave}
          disabled={!dirty || saving}
          className="btn-primary flex items-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
          {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="border-t border-coffee-200 dark:border-coffee-800 pt-8">
        <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-3">
          Enviar notificación de prueba
        </h2>
        <p className="text-sm text-coffee-500 dark:text-coffee-400 mb-4">
          Envía una notificación de prueba a <strong>todos</strong> los dispositivos suscritos (no
          solo el tuyo).
        </p>
        <button
          onClick={() => setConfirmTest(true)}
          disabled={testSending}
          className="flex items-center gap-2 px-4 py-2 border border-coffee-300 dark:border-coffee-600 text-coffee-700 dark:text-cream text-sm font-medium hover:bg-coffee-50 dark:hover:bg-coffee-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {testSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {testSending ? 'Enviando...' : 'Enviar notificación de prueba'}
        </button>

        {testResult && (
          <div
            className={`mt-4 text-sm flex items-center gap-2 ${testResult.failed > 0 ? 'text-yellow-600 dark:text-yellow-400' : 'text-green-700 dark:text-green-400'}`}
          >
            <span>✓ Enviada a {testResult.sent} dispositivo(s)</span>
            {testResult.failed > 0 && <span>· {testResult.failed} falló</span>}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmTest}
        title="Enviar notificación de prueba"
        message="Esto enviará una notificación push a todos los dispositivos suscritos (no solo el tuyo). ¿Continuar?"
        confirmText="Enviar"
        loading={testSending}
        onConfirm={handleTest}
        onCancel={() => setConfirmTest(false)}
      />
    </div>
  );
}
