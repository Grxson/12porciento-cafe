import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame } from 'lucide-react';
import { baristaApi } from '../api';
import RankBadge from '../components/RankBadge';
import { PageMeta } from '../hooks/usePageMeta';

interface LeaderboardEntry {
  id: string;
  userId: string;
  level: number;
  totalXp: number;
  totalBrews: number;
  favoriteMethod: string | null;
  user: { id: string; name: string };
  currentStreak?: number;
}

type Period = 'all-time' | 'this-month' | 'this-week';

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('all-time');

  useEffect(() => {
    setLoading(true);
    baristaApi.getLeaderboard(50, period)
      .then((res) => setEntries(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period]);

  const medals = ['🥇', '🥈', '🥉'];

  const periodLabels: Record<Period, string> = {
    'all-time': 'Todo el tiempo',
    'this-month': 'Este mes',
    'this-week': 'Esta semana',
  };

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
      <PageMeta title="Ranking Barista" description="Tabla de líderes de la comunidad barista 12%. Gana experiencia con cada preparación." />
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Clasificación</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">Mejores Baristas</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm">Top 50 por experiencia acumulada</p>

          {/* Period Filter Tabs */}
          <div className="flex justify-center gap-2 mt-6 flex-wrap">
            {(['all-time', 'this-month', 'this-week'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  period === p
                    ? 'bg-gold-500 text-coffee-900'
                    : 'bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 text-coffee-900 dark:text-cream hover:border-gold-400'
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>
        </div>

        {loading && (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-coffee-200 dark:border-coffee-800">
                <div className="flex items-center gap-4">
                  <div className="shimmer dark:shimmer-dark w-6 h-4" />
                  <div className="shimmer dark:shimmer-dark w-8 h-8 rounded-full" />
                  <div className="space-y-1">
                    <div className="shimmer dark:shimmer-dark h-4 w-32" />
                    <div className="shimmer dark:shimmer-dark h-3 w-20" />
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <div className="shimmer dark:shimmer-dark h-4 w-16" />
                  <div className="shimmer dark:shimmer-dark h-3 w-12" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-coffee-500">No se pudo cargar el ranking.</p>
            <button
              onClick={() => { setError(false); setLoading(true); baristaApi.getLeaderboard(50, period).then((res) => setEntries(res.data.data)).catch(() => setError(true)).finally(() => setLoading(false)); }}
              className="text-xs text-gold-500 hover:text-gold-400 mt-2 underline"
              aria-label="Reintentar carga del ranking"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-12">
            <Trophy className="w-12 h-12 text-coffee-700 mx-auto mb-3" />
            <p className="text-coffee-500">Aún no hay baristas registrados.</p>
            <p className="text-coffee-500 text-sm mt-1">¡Prepara tu primer café y sé el primero!</p>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <div className="space-y-2">
            {entries.map((entry, idx) => (
              <Link
                key={entry.id}
                to={`/perfil/barista/${entry.userId}`}
                className={`flex items-center gap-4 p-4 border transition-colors ${
                  idx === 0
                    ? 'bg-gold-500/10 border-gold-500/50 hover:border-gold-500'
                    : 'bg-white dark:bg-coffee-900 border-coffee-200 dark:border-coffee-800 hover:border-coffee-300 dark:hover:border-coffee-700'
                }`}
              >
                <span className="text-xl w-8 text-center shrink-0">
                  {medals[idx] ?? <span className="text-coffee-500 dark:text-coffee-600 text-sm font-mono">{idx + 1}</span>}
                </span>

                {/* Rank Badge */}
                <div className="shrink-0">
                  <RankBadge level={entry.level} size="sm" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-coffee-900 dark:text-cream font-medium truncate">{entry.user.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {entry.favoriteMethod && (
                      <p className="text-xs text-coffee-500">{entry.favoriteMethod}</p>
                    )}
                    {entry.currentStreak && entry.currentStreak > 0 && (
                      <p className="text-xs flex items-center gap-1">
                        <Flame className="w-3 h-3 text-red-500" />
                        <span className="text-red-600 dark:text-red-400">{entry.currentStreak}d</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-gold-400 font-bold">Nv. {entry.level}</p>
                  <p className="text-xs text-coffee-500">{entry.totalXp} XP · {entry.totalBrews} brews</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
