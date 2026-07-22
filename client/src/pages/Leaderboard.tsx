import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Flame, ChefHat } from 'lucide-react';
import { baristaApi } from '../api';
import RankBadge from '../components/RankBadge';
import { PageMeta } from '../hooks/usePageMeta';
import { useUser } from '../context/UserContext';

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

const podiumStyles = [
  { medal: '🥇', border: 'border-yellow-500', bg: 'bg-yellow-500/5', label: 'Oro' },
  { medal: '🥈', border: 'border-zinc-400', bg: 'bg-zinc-300/5', label: 'Plata' },
  { medal: '🥉', border: 'border-amber-700', bg: 'bg-amber-700/5', label: 'Bronce' },
];

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [period, setPeriod] = useState<Period>('all-time');
  const currentUser = useUser((s) => s.user);

  useEffect(() => {
    setLoading(true);
    baristaApi
      .getLeaderboard(50, period)
      .then((res) => setEntries(res.data.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [period]);

  const periodLabels: Record<Period, string> = {
    'all-time': 'Todo el tiempo',
    'this-month': 'Este mes',
    'this-week': 'Esta semana',
  };

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myEntry = entries.find((e) => e.userId === currentUser?.id);
  const myRank = myEntry ? entries.findIndex((e) => e.userId === currentUser?.id) + 1 : null;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
      <PageMeta
        title="Ranking Barista"
        description="Tabla de líderes de la comunidad barista 12%. Gana experiencia con cada preparación."
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Clasificación</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">
            Mejores Baristas
          </h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm">
            Top 50 por experiencia acumulada
          </p>

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

          {myRank && (
            <p className="mt-4 text-xs text-coffee-500">
              Tu posición actual: <span className="text-gold-500 font-bold">#{myRank}</span>
            </p>
          )}
        </div>

        {loading && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-4 border border-coffee-200 dark:border-coffee-800"
              >
                <div className="flex items-center gap-4">
                  <div className="shimmer dark:shimmer-dark w-8 h-4" />
                  <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full" />
                  <div className="space-y-1">
                    <div className="shimmer dark:shimmer-dark h-4 w-32" />
                    <div className="shimmer dark:shimmer-dark h-3 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-coffee-500">No se pudo cargar el ranking.</p>
            <button
              onClick={() => {
                setError(false);
                setLoading(true);
                baristaApi
                  .getLeaderboard(50, period)
                  .then((res) => setEntries(res.data.data))
                  .catch(() => setError(true))
                  .finally(() => setLoading(false));
              }}
              className="text-xs text-gold-500 hover:text-gold-400 mt-2 underline"
              aria-label="Reintentar carga del ranking"
            >
              Reintentar
            </button>
          </div>
        )}

        {!loading && !error && entries.length === 0 && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 border-2 border-gold-500 flex items-center justify-center">
              <Trophy className="w-10 h-10 text-gold-500" />
            </div>
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">
              Aún no hay baristas en el ranking
            </h2>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-8 max-w-sm mx-auto">
              Brew tu primer café para aparecer aquí
            </p>
            <Link to="/recetas" className="btn-primary inline-flex items-center gap-2">
              <ChefHat className="w-4 h-4" />
              Explorar recetas
            </Link>
          </div>
        )}

        {!loading && !error && entries.length > 0 && (
          <>
            {/* Podium: Top 3 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              {podium.map((entry, idx) => {
                const style = podiumStyles[idx];
                const isMe = entry.userId === currentUser?.id;
                return (
                  <Link
                    key={entry.id}
                    to={`/perfil/barista/${entry.userId}`}
                    className={`relative p-6 border-2 ${style.border} ${style.bg} bg-white dark:bg-coffee-900 transition-all hover:-translate-y-0.5 hover:shadow-lg ${
                      isMe
                        ? 'ring-2 ring-gold-500 ring-offset-2 ring-offset-coffee-50 dark:ring-offset-coffee-950'
                        : ''
                    }`}
                  >
                    <span className="absolute top-3 right-3 text-xs text-coffee-500 uppercase tracking-widest">
                      {style.label}
                    </span>
                    <div className="text-4xl mb-3">{style.medal}</div>
                    <div className="flex items-center gap-3 mb-3">
                      <RankBadge level={entry.level} size="md" />
                    </div>
                    <p className="font-serif text-xl text-coffee-900 dark:text-cream truncate">
                      {entry.user.name}
                    </p>
                    <p className="text-gold-500 font-bold text-sm mt-1">Nv. {entry.level}</p>
                    <p className="text-xs text-coffee-500 mt-1">
                      {entry.totalXp} XP · {entry.totalBrews} brews
                    </p>
                    {entry.favoriteMethod && (
                      <p className="text-xs text-coffee-500 mt-2">{entry.favoriteMethod}</p>
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Rest of list: 4-50 in 2-col grid */}
            {rest.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {rest.map((entry, idx) => {
                  const rank = idx + 4;
                  const isMe = entry.userId === currentUser?.id;
                  return (
                    <Link
                      key={entry.id}
                      to={`/perfil/barista/${entry.userId}`}
                      className={`flex items-center gap-4 p-4 border transition-all ${
                        isMe
                          ? 'bg-gold-500/10 border-gold-500 ring-2 ring-gold-500/30'
                          : 'bg-white dark:bg-coffee-900 border-coffee-200 dark:border-coffee-800 hover:border-coffee-300 dark:hover:border-coffee-700 hover:-translate-y-0.5 hover:shadow-md'
                      }`}
                    >
                      <span className="text-sm w-8 text-center shrink-0 text-coffee-500 font-mono">
                        {rank}
                      </span>
                      <div className="shrink-0">
                        <RankBadge level={entry.level} size="sm" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-coffee-900 dark:text-cream font-medium truncate flex items-center gap-2">
                          {entry.user.name}
                          {isMe && <span className="text-xs text-gold-500">(tú)</span>}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {entry.favoriteMethod && (
                            <p className="text-xs text-coffee-500">{entry.favoriteMethod}</p>
                          )}
                          {entry.currentStreak && entry.currentStreak > 0 && (
                            <p className="text-xs flex items-center gap-1">
                              <Flame className="w-3 h-3 text-red-500" />
                              <span className="text-red-600 dark:text-red-400">
                                {entry.currentStreak}d
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-gold-400 font-bold">Nv. {entry.level}</p>
                        <p className="text-xs text-coffee-500">
                          {entry.totalXp} XP · {entry.totalBrews} brews
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
