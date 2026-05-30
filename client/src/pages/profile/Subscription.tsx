import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { CreditCard, AlertTriangle } from 'lucide-react';
import { usersApi } from '../../api';
import { useUser } from '../../context/UserContext';
import type { Subscription as Sub } from '../../types';

export default function Subscription() {
  const [sub, setSub] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const setHasSubscription = useUser((s) => s.setHasSubscription);

  useEffect(() => {
    usersApi.mySubscription().then((r) => { setSub(r.data); setLoading(false); });
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!sub) {
    return (
      <div className="text-center py-16">
        <CreditCard className="w-12 h-12 text-coffee-600 mx-auto mb-4" />
        <p className="text-coffee-400 mb-4">Sin suscripción activa.</p>
        <Link to="/suscripciones" className="btn-primary">Ver planes</Link>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg">
      <div className="bg-coffee-900 border border-coffee-800 p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-serif text-xl text-cream">{sub.plan}</h3>
            <p className="text-coffee-400 text-sm mt-0.5">
              Frecuencia: {sub.frequency === 'bimonthly' ? 'Cada 2 meses' : 'Mensual'}
            </p>
          </div>
          <span className="text-xs px-2 py-1 bg-green-900/30 text-green-400">ACTIVA</span>
        </div>
        <div className="border-t border-coffee-800 pt-4 text-sm text-coffee-300">
          <p>
            Próxima facturación:{' '}
            <span className="text-cream">
              {new Date(sub.nextBilling).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}
            </span>
          </p>
        </div>
      </div>

      {!showConfirm ? (
        <button onClick={() => setShowConfirm(true)}
          className="text-sm text-coffee-400 hover:text-red-400 transition-colors border border-coffee-700 hover:border-red-400/40 px-4 py-2">
          Cancelar suscripción
        </button>
      ) : (
        <div className="bg-coffee-900 border border-red-500/30 p-5">
          <div className="flex items-start gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <p className="text-coffee-200 text-sm">
              ¿Confirmas que quieres cancelar? Perderás acceso al siguiente envío si cancelas antes de la fecha de facturación.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={handleCancel} disabled={cancelling}
              className="text-sm text-red-400 border border-red-500/40 hover:border-red-400 px-4 py-2 transition-colors disabled:opacity-50">
              {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
            </button>
            <button onClick={() => setShowConfirm(false)}
              className="text-sm text-coffee-300 hover:text-cream px-4 py-2 transition-colors">
              Mantener suscripción
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}
