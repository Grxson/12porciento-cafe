import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  AlertTriangle,
  Edit3,
  Lock,
  Check,
  PauseCircle,
  PlayCircle,
} from 'lucide-react';
import { usersApi, subscriptionsApi, subscriptionPauseApi } from '../../api';
import { useUser } from '../../context/UserContext';
import PageSkeleton from '../../components/PageSkeleton';
import SubscriptionBilling from './SubscriptionBilling';
import CoffeePicker from '../../components/CoffeePicker';
import type { Subscription as Sub, SubscriptionPlan } from '../../types';
import { PLAN_SLOTS } from '../../types';

const MIN_RESUME_DATE = (() => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
})();
import { resolveImageUrl } from '../../utils/imageUrl';
import { useToast } from '../../context/ToastContext';
import { PageMeta } from '../../hooks/usePageMeta';
import { getApiError } from '../../lib/api-error';

const FULFILLMENT_LABELS: Record<string, { label: string; color: string }> = {
  PENDIENTE: {
    label: 'Pendiente de envío',
    color: 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  },
  PREPARANDO: { label: 'Preparando', color: 'text-blue-400 bg-blue-900/20 border-blue-500/30' },
  ENVIADO: { label: 'En camino', color: 'text-green-400 bg-green-900/20 border-green-500/30' },
  ENTREGADO: { label: 'Entregado', color: 'text-coffee-600 bg-coffee-100 border-coffee-300 dark:text-coffee-300 dark:bg-coffee-800/40 dark:border-coffee-700' },
};

export default function Subscription() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPauseConfirm, setShowPauseConfirm] = useState(false);
  const [pauseReason, setPauseReason] = useState('');
  const [pauseUntil, setPauseUntil] = useState('');
  const [editing, setEditing] = useState(false);
  const [editCoffees, setEditCoffees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const setHasSubscription = useUser((s) => s.setHasSubscription);
  const { add: addToast } = useToast();

  useEffect(() => {
    usersApi
      .mySubscription()
      .then((r) => {
        setSub(r.data);
        if (r.data) {
          setEditCoffees(
            r.data.items?.map((i) => String((i as unknown as Record<string, unknown>).productId)) ??
              [],
          );
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async () => {
    if (!sub) return;
    setCancelling(true);
    try {
      await usersApi.cancelSubscription(sub.id);
      setSub(null);
      setHasSubscription(false);
      setShowConfirm(false);
    } finally {
      setCancelling(false);
    }
  };

  const handlePause = async () => {
    if (!sub) return;
    setPausing(true);
    try {
      const res = await subscriptionPauseApi.pause({
        reason: pauseReason || undefined,
        until: pauseUntil || undefined,
      });
      setSub(res.data.data);
      setShowPauseConfirm(false);
      setPauseReason('');
      setPauseUntil('');
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al pausar suscripción'), 'error');
    } finally {
      setPausing(false);
    }
  };

  const handleResume = async () => {
    if (!sub) return;
    setPausing(true);
    try {
      const res = await subscriptionPauseApi.resume();
      setSub(res.data.data);
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al reanudar suscripción'), 'error');
    } finally {
      setPausing(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!sub) return;
    const slots = PLAN_SLOTS[sub.plan as SubscriptionPlan];
    if (!slots || editCoffees.length < slots.min) {
      setSaveError(`Selecciona al menos ${slots?.min ?? 2} cafés`);
      return;
    }
    setSaving(true);
    setSaveError('');
    try {
      const updated = await subscriptionsApi.updateItems(sub.id, editCoffees, 'GRANO');
      setSub(updated.data);
      setEditing(false);
      addToast('Selección de cafés actualizada ✓', 'success');
    } catch (err: unknown) {
      setSaveError(getApiError(err, 'Error al guardar cambios'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-4">
        <PageMeta title="Mi Suscripción" />
        <PageSkeleton variant="profile-list" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <PageMeta title="Mi Suscripción" />
        <CreditCard className="w-12 h-12 text-coffee-400 dark:text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-600 dark:text-coffee-400 mb-4">Sin suscripción activa.</p>
        <Link to="/suscripciones" className="btn-primary">
          Ver planes
        </Link>
      </div>
    );
  }

  const fulfillment = FULFILLMENT_LABELS[sub.fulfillmentStatus] ?? FULFILLMENT_LABELS['PENDIENTE'];
  const canEdit = sub.fulfillmentStatus === 'PENDIENTE';

  return (
    <div>
      <PageMeta title="Mi Suscripción" />
      {/* Subscription card */}
      <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 mb-6 max-w-2xl">
        <div className="flex flex-wrap items-start justify-between gap-2 mb-5">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-serif text-xl text-coffee-900 dark:text-cream">{sub.plan}</h3>
              {(() => {
                const statusStyles: Record<string, string> = {
                  ACTIVE: 'bg-green-900/30 text-green-400 border-green-500/20',
                  PAUSED: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/20',
                  CANCELLED: 'bg-red-900/30 text-red-400 border-red-500/20',
                };
                const statusLabels: Record<string, string> = {
                  ACTIVE: 'Activa',
                  PAUSED: 'Pausada',
                  CANCELLED: 'Cancelada',
                };
                const cls = statusStyles[sub.status] ?? statusStyles.ACTIVE;
                const lbl = statusLabels[sub.status] ?? 'Activa';
                return (
                  <span className={`text-xs px-2 py-1 border uppercase tracking-wider ${cls}`}>
                    {lbl}
                  </span>
                );
              })()}
            </div>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm">
              {sub.frequency === 'bimonthly' ? 'Cada 2 meses' : 'Mensual'} · Grano entero
            </p>
          </div>
          <span className={`text-xs px-3 py-1 border rounded-sm ${fulfillment.color}`}>
            {fulfillment.label}
          </span>
        </div>

        {/* Lock banner when not editable */}
        {!canEdit && (
          <div className="flex items-start gap-2.5 bg-coffee-100 dark:bg-coffee-800/50 border border-coffee-200 dark:border-coffee-700 p-3 mb-5 text-xs text-coffee-600 dark:text-coffee-400">
            <Lock className="w-3.5 h-3.5 text-coffee-500 dark:text-coffee-400 shrink-0 mt-0.5" />
            {sub.fulfillmentStatus === 'PREPARANDO'
              ? 'Tu envío está en preparación — podrás cambiar tus cafés cuando llegue.'
              : sub.fulfillmentStatus === 'ENVIADO'
                ? 'Tu pedido está en camino — podrás cambiar tus cafés cuando lo recibas.'
                : 'Cambios disponibles hasta el inicio del próximo ciclo.'}
          </div>
        )}

        {/* Selected coffees */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-coffee-500 dark:text-coffee-500 uppercase tracking-widest">
              Tus cafés este ciclo
            </p>
            {canEdit && !editing && (
              <button
                onClick={() => setEditing(true)}
                className="flex items-center gap-1.5 text-xs text-gold-500 hover:text-gold-400 transition-colors"
              >
                <Edit3 className="w-3 h-3" /> Cambiar selección
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {sub.items?.map((item) => (
              <div
                key={item.id}
                className="flex gap-2 bg-coffee-100 dark:bg-coffee-800/50 p-2 min-w-0"
              >
                <img
                  src={resolveImageUrl(item.product.imageUrl)}
                  alt={item.product.name}
                  className="w-10 h-10 object-cover shrink-0"
                />
                <p className="text-coffee-800 dark:text-coffee-300 text-xs leading-tight self-center truncate min-w-0">
                  {item.product.name}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-coffee-200 dark:border-coffee-800 pt-4 text-xs text-coffee-600 dark:text-coffee-400">
          Próximo envío:{' '}
          <span className="text-coffee-900 dark:text-cream">
            {new Date(sub.nextBilling).toLocaleDateString('es-MX', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Billing panel */}
      <div className="mt-6 pt-6 border-t border-coffee-200 dark:border-coffee-700 max-w-2xl">
        <SubscriptionBilling subscriptionId={sub.id} />
      </div>

      {/* Edit picker */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="bg-white dark:bg-coffee-900 border border-gold-500/20 p-6 max-w-2xl">
              <h4 className="font-serif text-lg text-coffee-900 dark:text-cream mb-6">
                Cambia tu selección
              </h4>
              <CoffeePicker
                plan={sub.plan as SubscriptionPlan}
                selected={editCoffees}
                onChange={setEditCoffees}
              />
              {saveError && <p className="text-red-400 text-xs mt-4">{saveError}</p>}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleSaveEdit}
                  disabled={saving}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  {saving ? 'Guardando...' : 'Guardar cambios'}
                </button>
                <button
                  onClick={() => {
                    setEditing(false);
                    setSaveError('');
                  }}
                  className="btn-outline text-sm py-2.5 px-5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pause / Resume */}
      {(() => {
        const maxSkips = sub.maxSkips ?? 0;
        const skipCount = sub.skipCount ?? 0;
        const remaining = maxSkips > 0 ? maxSkips - skipCount : null;
        const maxedOut = maxSkips > 0 && skipCount >= maxSkips;

        if (sub.status === 'ACTIVE') {
          return (
            <>
              {/* Remaining pauses indicator */}
              {remaining !== null && (
                <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-3">
                  {remaining > 0
                    ? `${remaining} de ${maxSkips} pausas disponibles`
                    : 'Has agotado tus pausas'}
                </p>
              )}

              {maxedOut ? (
                <div className="bg-coffee-100 dark:bg-coffee-800/50 border border-coffee-200 dark:border-coffee-700 p-4 max-w-md mb-3">
                  <p className="text-xs text-coffee-600 dark:text-coffee-400">
                    Has alcanzado el máximo de pausas permitidas. Escríbenos a{' '}
                    <a
                      href="mailto:soporte@12porciento.mx"
                      className="text-gold-500 hover:text-gold-400 underline"
                    >
                      soporte@12porciento.mx
                    </a>{' '}
                    si necesitas ayuda.
                  </p>
                </div>
              ) : !showPauseConfirm ? (
                <button
                  onClick={() => setShowPauseConfirm(true)}
                  className="text-xs text-coffee-500 hover:text-gold-500 border border-coffee-200 dark:border-coffee-800 hover:border-gold-500/30 px-4 py-2 min-h-[44px] transition-colors mr-3"
                >
                  <PauseCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                  Pausar suscripción
                </button>
              ) : (
                <div className="bg-white dark:bg-coffee-900 border border-gold-500/30 p-5 max-w-md mb-4">
                  <div className="flex items-start gap-3 mb-4">
                    <PauseCircle className="w-5 h-5 text-gold-500 shrink-0 mt-0.5" />
                    <p className="text-coffee-800 dark:text-coffee-300 text-sm">
                      ¿Pausar tu suscripción? Seguiremos guardando tu selección de cafés.
                    </p>
                  </div>
                  {/* Reason dropdown */}
                  <div className="mb-4">
                    <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">
                      Motivo
                    </label>
                    <select
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      className="input-dark !text-sm w-full"
                    >
                      <option value="">Seleccionar motivo</option>
                      <option value="VIAJE">Viaje</option>
                      <option value="EXCESO">Exceso de café</option>
                      <option value="ECONOMICO">Motivos económicos</option>
                      <option value="OTRO">Otro</option>
                    </select>
                  </div>
                  {/* Optional date picker */}
                  <div className="mb-4">
                    <label className="block text-xs text-coffee-600 dark:text-coffee-500 uppercase tracking-widest mb-2">
                      Reanudar el (opcional)
                    </label>
                    <input
                      type="date"
                      value={pauseUntil}
                      onChange={(e) => setPauseUntil(e.target.value)}
                      min={MIN_RESUME_DATE}
                      className="input-dark !text-sm w-full"
                    />
                  </div>
                  {remaining !== null && (
                    <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-4">
                      {remaining - 1} de {maxSkips} pausas restantes después de esta
                    </p>
                  )}
                  <div className="flex gap-3">
                    <button
                      onClick={handlePause}
                      disabled={pausing}
                      className="text-xs text-gold-500 border border-gold-500/40 hover:border-gold-500 px-4 py-2 min-h-[44px] transition-colors disabled:opacity-50"
                    >
                      {pausing ? 'Pausando...' : 'Confirmar pausa'}
                    </button>
                    <button
                      onClick={() => {
                        setShowPauseConfirm(false);
                        setPauseReason('');
                        setPauseUntil('');
                      }}
                      className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream px-4 py-2 min-h-[44px] transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </>
          );
        }

        if (sub.status === 'PAUSED') {
          return (
            <div className="max-w-md mb-4">
              {/* Pause info card */}
              <div className="bg-white dark:bg-coffee-900 border border-yellow-500/30 p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <PauseCircle className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs text-yellow-400 font-medium uppercase tracking-wider">
                    Suscripción pausada
                  </span>
                </div>
                {sub.pausedAt && (
                  <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                    Desde:{' '}
                    {new Date(sub.pausedAt).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
                {sub.pausedReason && (
                  <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                    Motivo:{' '}
                    {(
                      {
                        VIAJE: 'Viaje',
                        EXCESO: 'Exceso de café',
                        ECONOMICO: 'Motivos económicos',
                        OTRO: 'Otro',
                      } as Record<string, string>
                    )[sub.pausedReason] ?? sub.pausedReason}
                  </p>
                )}
                {sub.pausedUntil && (
                  <p className="text-xs text-coffee-600 dark:text-coffee-400 mb-1">
                    Reanudación automática:{' '}
                    {new Date(sub.pausedUntil).toLocaleDateString('es-MX', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                )}
              </div>
              <button
                onClick={handleResume}
                disabled={pausing}
                className="text-xs text-green-500 hover:text-green-400 border border-green-500/30 hover:border-green-500/50 px-4 py-2 min-h-[44px] transition-colors disabled:opacity-50"
              >
                <PlayCircle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                {pausing ? 'Reactivando...' : 'Reactivar suscripción'}
              </button>
            </div>
          );
        }

        return null;
      })()}

      {/* Cancel */}
      {sub.status !== 'CANCELLED' && sub.status !== 'PAUSED' && (
        <>
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-xs text-coffee-500 hover:text-red-400 border border-coffee-200 dark:border-coffee-800 hover:border-red-400/30 px-4 py-2 min-h-[44px] transition-colors mt-3"
            >
              Cancelar suscripción
            </button>
          ) : (
            <div className="bg-white dark:bg-coffee-900 border border-red-500/30 p-5 max-w-md mt-3">
              <div className="flex items-start gap-3 mb-4">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <p className="text-coffee-800 dark:text-coffee-300 text-sm">
                  ¿Confirmas que quieres cancelar? Perderás el siguiente envío si cancelas antes de
                  la fecha de facturación.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="text-xs text-red-400 border border-red-500/40 hover:border-red-400 px-4 py-2 min-h-[44px] transition-colors disabled:opacity-50"
                >
                  {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="text-xs text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream px-4 py-2 min-h-[44px] transition-colors"
                >
                  Mantener
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
