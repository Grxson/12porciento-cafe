import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { baristaApi } from '../api';

interface StatsResponse {
  totalBrews: number;
  monthlyTrends: { month: string; count: number }[];
}

const DISMISS_KEY = 'subscription-match-dismissed';

const PLANS = [
  { min: 1, max: 4, name: 'Explorador', desc: 'Prueba diferentes métodos cada mes' },
  { min: 5, max: 10, name: 'Fundador', desc: 'Café fresco para tu rutina diaria' },
  { min: 11, max: Infinity, name: 'Connoisseur', desc: 'Para el verdadero apasionado' },
] as const;

function recommendPlan(brewsPerMonth: number): { name: string; desc: string } {
  const plan = PLANS.find((p) => brewsPerMonth >= p.min && brewsPerMonth <= p.max);
  return plan ?? { name: 'Explorador', desc: 'Prueba diferentes métodos cada mes' };
}

interface Props {
  userId: string;
}

export default function SubscriptionMatchBanner({ userId }: Props) {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === 'true');
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId || dismissed) return;
    baristaApi
      .getStats(userId)
      .then((res) => setStats(res.data.data))
      .catch(() => {
        /* silent */
      })
      .finally(() => setLoading(false));
  }, [userId, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, 'true');
    setDismissed(true);
  };

  if (dismissed || loading) return null;

  if (!stats || stats.totalBrews < 5) return null;

  const monthsActive = Math.max(stats.monthlyTrends?.length ?? 1, 1);
  const brewsPerMonth = Math.round(stats.totalBrews / monthsActive);
  const plan = recommendPlan(brewsPerMonth);

  return (
    <div className="relative bg-gradient-to-r from-gold-500/10 to-coffee-800/50 border border-gold-500/30 rounded-xl p-4 pr-10 mb-6">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-coffee-400 hover:text-coffee-200 transition-colors"
        aria-label="Cerrar"
      >
        <X className="w-4 h-4" />
      </button>

      <p className="text-xs text-gold-400 uppercase tracking-wider font-semibold mb-1">
        Plan recomendado para ti
      </p>
      <p className="font-serif text-lg text-cream font-bold">{plan.name}</p>
      <p className="text-sm text-coffee-300 mb-3">{plan.desc}</p>

      <Link
        to="/suscripciones"
        className="inline-block text-xs font-semibold text-gold-400 hover:text-gold-300 border border-gold-500/40 hover:border-gold-500/70 rounded-lg px-3 py-1.5 transition-colors"
      >
        Ver suscripciones
      </Link>
    </div>
  );
}
