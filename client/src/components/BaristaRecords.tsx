import { useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, Flame, Coffee, Zap, Clock, Sun, Moon, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { baristaApi } from '../api/barista';

interface BaristaStatsData {
  favoriteMethod: string | null;
  favMethodEmoji: string | null;
  avgRating: number;
  totalBrews: number;
  brewsPerMethod: Record<string, number>;
  xpPerWeek: Array<{ week: string; xp: number }>;
  flavorTags: Record<string, number>;
  equipmentUsage: Record<string, number>;
  monthlyTrends: Array<{ month: string; count: number }>;
  timeStats: {
    earlyBirdCount: number;
    nightOwlCount: number;
    weekendCount: number;
  };
  highestRating?: number;
  longestStreak?: number;
  mostBrewsInADay?: number;
  shortestBrewTime?: number;
  longestBrewTime?: number;
}

interface BaristaRecordsProps {
  userId: string;
  newRecord?: boolean;
}

function formatBrewTime(seconds?: number): string {
  if (seconds == null) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function RecordCard({
  icon,
  label,
  value,
  sub,
  delay,
  isNew,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  sub?: string;
  delay: number;
  isNew?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className={`bg-white dark:bg-coffee-900 border p-4 ${
        isNew
          ? 'border-gold-500 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
          : 'border-coffee-200 dark:border-coffee-800'
      }`}
    >
      <div className="flex items-center gap-3 mb-2">
        <span className="text-gold-500">{icon}</span>
        <p className="text-xs text-coffee-500 uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold text-coffee-900 dark:text-cream">{value}</p>
      {sub && <p className="text-xs text-coffee-400 dark:text-coffee-500 mt-1">{sub}</p>}
    </motion.div>
  );
}

function SkeletonCard({ delay }: { delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35, ease: 'easeOut' }}
      className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-3"
    >
      <div className="flex items-center gap-3">
        <div className="shimmer dark:shimmer-dark w-5 h-5 rounded" />
        <div className="shimmer dark:shimmer-dark h-3 w-24" />
      </div>
      <div className="shimmer dark:shimmer-dark h-7 w-16" />
      <div className="shimmer dark:shimmer-dark h-3 w-20" />
    </motion.div>
  );
}

export default function BaristaRecords({ userId, newRecord }: BaristaRecordsProps) {
  const {
    data: resp,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['barista-stats', userId],
    queryFn: () => baristaApi.getStats(userId).then((r) => r.data.data as BaristaStatsData),
    enabled: !!userId,
  });

  useEffect(() => {
    if (newRecord) {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#d4af37', '#8B4513', '#f5e6c8'],
      });
    }
  }, [newRecord]);

  const records = useMemo(() => {
    if (!resp) return [];
    return [
      {
        icon: <Star className="w-5 h-5" />,
        label: 'Mejor calificación',
        value: resp.highestRating != null ? `${resp.highestRating}/10` : '—',
        sub: resp.totalBrews > 0 ? `${resp.totalBrews} brews` : undefined,
      },
      {
        icon: <Flame className="w-5 h-5" />,
        label: 'Racha más larga',
        value: resp.longestStreak != null ? `${resp.longestStreak} días` : '—',
      },
      {
        icon: <Coffee className="w-5 h-5" />,
        label: 'Más brews en un día',
        value: resp.mostBrewsInADay != null ? `${resp.mostBrewsInADay}` : '—',
      },
      {
        icon: <span className="text-lg">{resp.favMethodEmoji ?? '☕'}</span>,
        label: 'Método favorito',
        value: resp.favoriteMethod ?? '—',
      },
      {
        icon: <Zap className="w-5 h-5" />,
        label: 'Brew más rápido',
        value: formatBrewTime(resp.shortestBrewTime),
      },
      {
        icon: <Clock className="w-5 h-5" />,
        label: 'Brew más lento',
        value: formatBrewTime(resp.longestBrewTime),
      },
      {
        icon: <Sun className="w-5 h-5" />,
        label: 'Madrugador',
        value: `${resp.timeStats?.earlyBirdCount ?? 0} brews`,
      },
      {
        icon: <Moon className="w-5 h-5" />,
        label: 'Búho nocturno',
        value: `${resp.timeStats?.nightOwlCount ?? 0} brews`,
      },
    ];
  }, [resp]);

  if (isLoading) {
    return (
      <div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 0.04} />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500 mb-4">Error al cargar records</p>
        <button
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 bg-gold-500 hover:bg-gold-400 text-coffee-950 px-4 py-2 text-sm font-medium transition-colors"
        >
          <RotateCw className="w-4 h-4" />
          Reintentar
        </button>
      </div>
    );
  }

  if (!resp || resp.totalBrews === 0) {
    return (
      <div className="text-center py-8">
        <Coffee className="w-10 h-10 text-coffee-400 dark:text-coffee-600 mx-auto mb-3" />
        <p className="text-coffee-600 dark:text-coffee-400 text-sm">
          Registra tu primer brew para ver records
        </p>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {records.map((rec, i) => (
          <RecordCard
            key={rec.label}
            icon={rec.icon}
            label={rec.label}
            value={rec.value}
            sub={rec.sub}
            delay={i * 0.05}
            isNew={newRecord && i === 0}
          />
        ))}
      </div>
    </motion.div>
  );
}
