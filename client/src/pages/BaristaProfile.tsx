import { useParams, Link } from 'react-router-dom';
import { Trophy, Zap, Coffee, Flame, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useBarista } from '../hooks/useBarista';
import PushPermissionBanner from '../components/PushPermissionBanner';
import { useUser } from '../context/UserContext';
import BrewComparator from '../components/barista/BrewComparator';
import StreakHeatmap from '../components/StreakHeatmap';
import RankBadge from '../components/RankBadge';
import StreakWidget from '../components/StreakWidget';
import { PageMeta } from '../hooks/usePageMeta';
import { baristaApi } from '../api/barista';

interface UserStats {
  favoriteMethod: string | null;
  favMethodEmoji: string | null;
  avgRating: number;
  totalBrews: number;
  brewsPerMethod: Record<string, number>;
  xpPerWeek: Array<{ week: string; xp: number }>;
}

export default function BaristaProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { profile, loading, error } = useBarista(userId);
  const currentUser = useUser((s) => s.user);
  const isOwnProfile = currentUser?.id === userId;
  const [stats, setStats] = useState<UserStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    if (!userId) return;
    setStatsLoading(true);
    baristaApi
      .getStats(userId)
      .then((res) => setStats(res.data.data))
      .catch((err) => console.error('Error fetching stats:', err))
      .finally(() => setStatsLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
        <PageMeta title="Perfil Barista" description="Nivel barista, experiencia y logros." />
        <div className="max-w-2xl mx-auto px-4 space-y-6">
          <div className="flex items-center gap-4 pt-6">
            <div className="shimmer dark:shimmer-dark w-16 h-16 rounded-full" />
            <div className="space-y-2 flex-1">
              <div className="shimmer dark:shimmer-dark h-6 w-40" />
              <div className="shimmer dark:shimmer-dark h-4 w-24" />
            </div>
          </div>
          <div className="shimmer dark:shimmer-dark h-3 w-full rounded-full" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-2">
                <div className="shimmer dark:shimmer-dark h-7 w-12" />
                <div className="shimmer dark:shimmer-dark h-3 w-full" />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-2">
                <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
                <div className="shimmer dark:shimmer-dark h-3 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-24 flex items-center justify-center px-4">
        <PageMeta title="Perfil Barista" description="Nivel barista, experiencia y logros." />
        <div className="text-center max-w-sm">
          <Coffee className="w-12 h-12 text-coffee-700 mx-auto mb-4" />
          {isOwnProfile ? (
            <>
              <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">Sin brews aún</h2>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6">
                Prepara una receta en modo en vivo y regístrala para comenzar tu camino como barista.
              </p>
              <Link to="/recetas" className="btn-primary">Ver recetas</Link>
            </>
          ) : (
            <>
              <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream mb-2">Perfil no encontrado</h2>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm">Este barista aún no ha registrado ningún brew.</p>
            </>
          )}
        </div>
      </div>
    );
  }

  const xpInCurrentLevel = profile.totalXp % 100;
  const xpProgress = xpInCurrentLevel / 100;
  const xpToNext = 100 - xpInCurrentLevel;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
      <PageMeta title={`Perfil de ${currentUser?.name || 'Barista'}`} description="Nivel barista, experiencia y logros." />
      <div className="max-w-2xl mx-auto px-4">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Perfil Barista</p>

          {/* Rank Badge */}
          <div className="flex justify-center mb-4">
            <RankBadge level={profile.level} size="lg" />
          </div>

          {profile.user && (
            <p className="font-serif text-2xl text-coffee-900 dark:text-cream mb-1">{profile.user.name}</p>
          )}
          <h1 className="font-serif text-4xl text-gold-400 mb-1">Nivel {profile.level}</h1>
          {profile.rankTitle && (
            <p className="text-coffee-600 dark:text-coffee-400 text-sm font-medium mb-1">{profile.rankTitle}</p>
          )}
          <p className="text-coffee-600 dark:text-coffee-400 text-sm">{profile.totalBrews} brews registrados</p>
        </div>

        {/* Permission prompt — only on own profile */}
        {isOwnProfile && <PushPermissionBanner />}

        {/* Streak Widget */}
        {profile.currentStreak !== undefined && (
          <div className="mb-8">
            <StreakWidget currentStreak={profile.currentStreak} isActive={profile.currentStreak > 0} />
          </div>
        )}

        {/* Streak Heatmap */}
        {profile.streakData && profile.streakData.length > 0 && (
          <StreakHeatmap data={profile.streakData} />
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <Trophy className="w-5 h-5 text-gold-500" />, label: 'Nivel', value: profile.level },
            { icon: <Zap className="w-5 h-5 text-gold-500" />, label: 'XP Total', value: profile.totalXp },
            { icon: <Coffee className="w-5 h-5 text-gold-500" />, label: 'Brews', value: profile.totalBrews },
          ].map(({ icon, label, value }) => (
            <div key={label} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 text-center">
              <div className="flex justify-center mb-2">{icon}</div>
              <p className="text-xs text-coffee-500 uppercase mb-1">{label}</p>
              <p className="text-2xl font-bold text-coffee-900 dark:text-cream">{value}</p>
            </div>
          ))}
        </div>

        {/* XP Progress */}
        <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 mb-8">
          <div className="flex justify-between mb-2">
            <p className="text-sm text-coffee-600 dark:text-coffee-400">Progreso nivel {profile.level + 1}</p>
            <p className="text-xs text-coffee-500">{xpInCurrentLevel}/100 XP</p>
          </div>
          <div
            className="h-2 bg-coffee-200 dark:bg-coffee-800 rounded-full overflow-hidden"
            role="progressbar"
            aria-valuenow={Math.round(xpProgress * 100)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso XP al siguiente nivel"
          >
            <div
              className="h-full bg-gold-500 transition-all duration-500"
              style={{ width: `${xpProgress * 100}%` }}
            />
          </div>
          <p className="text-xs text-coffee-500 mt-2">{xpToNext} XP para el siguiente nivel</p>
        </div>

        {/* G6: Tus Logros (Achievement Showcase) */}
        {profile.achievements.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">Tus Logros</h2>
              {profile.achievements.length > 4 && (
                <Link to={`/logros`} className="text-xs text-gold-500 hover:text-gold-400 transition-colors">
                  Ver todos ({profile.achievements.length})
                </Link>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {profile.achievements.slice(0, 4).map((unlock) => (
                <div
                  key={unlock.id}
                  className="bg-white dark:bg-coffee-900 border border-gold-500/30 p-3 text-center hover:border-gold-500 transition-colors"
                  title={unlock.achievement.description}
                >
                  <p className="text-3xl mb-1">{unlock.achievement.icon}</p>
                  <p className="text-[10px] text-coffee-900 dark:text-cream font-semibold leading-tight">{unlock.achievement.name}</p>
                  <p className="text-[10px] text-gold-500 mt-0.5">+{unlock.achievement.xpReward} XP</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* G8: Tus Stats */}
        {!statsLoading && stats && (
          <div className="mb-8">
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">Tus Stats</h2>
            <div className="space-y-4">
              {/* Favorite Method */}
              {stats.favoriteMethod && (
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4">
                  <p className="text-xs text-coffee-500 uppercase mb-2">Método Favorito</p>
                  <p className="text-xl font-semibold text-coffee-900 dark:text-cream">
                    {stats.favMethodEmoji} {stats.favoriteMethod}
                  </p>
                  <p className="text-xs text-coffee-600 dark:text-coffee-400 mt-1">
                    {stats.brewsPerMethod[stats.favoriteMethod] || 0} brews
                  </p>
                </div>
              )}

              {/* Average Rating */}
              {stats.totalBrews > 0 && (
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4">
                  <p className="text-xs text-coffee-500 uppercase mb-2">Calificación Promedio</p>
                  <div className="flex items-center gap-2">
                    <p className="text-2xl font-bold text-gold-500">{stats.avgRating}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-4 h-4 ${
                            i < Math.round(stats.avgRating)
                              ? 'fill-gold-500 text-gold-500'
                              : 'text-coffee-300 dark:text-coffee-700'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Brews Per Method */}
              {Object.keys(stats.brewsPerMethod).length > 0 && (
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4">
                  <p className="text-xs text-coffee-500 uppercase mb-3">Brews por Método</p>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(stats.brewsPerMethod).map(([method, count]) => (
                      <div key={method} className="bg-coffee-50 dark:bg-coffee-800 p-2 text-center rounded">
                        <p className="text-xs text-coffee-600 dark:text-coffee-300">{method}</p>
                        <p className="text-lg font-bold text-coffee-900 dark:text-cream">{count}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* XP Per Week */}
              {stats.xpPerWeek.length > 0 && (
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4">
                  <p className="text-xs text-coffee-500 uppercase mb-3">XP/Semana (Últimas 8)</p>
                  <div className="flex items-end gap-1 h-24">
                    {stats.xpPerWeek.map((week, i) => {
                      const maxXp = Math.max(...stats.xpPerWeek.map((w) => w.xp));
                      const height = maxXp > 0 ? (week.xp / maxXp) * 100 : 0;
                      return (
                        <div
                          key={i}
                          className="flex-1 bg-gold-500 rounded-t hover:bg-gold-400 transition-colors"
                          style={{ height: `${Math.max(height, 5)}%` }}
                          title={`${week.week}: ${week.xp} XP`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Brew Comparator */}
        {profile.brewLogs.length > 0 && (
          <BrewComparator brews={profile.brewLogs} />
        )}

        {/* Recent Brews */}
        {profile.brewLogs.length > 0 && (
          <div>
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-4">Brews Recientes</h2>
            <div className="space-y-3">
              {profile.brewLogs.map((brew) => (
                <div key={brew.id} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
                  {brew.photoUrl && (
                    <img src={brew.photoUrl} alt="brew" className="w-full h-32 object-cover" />
                  )}
                  <div className="p-4 flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-coffee-900 dark:text-cream font-medium truncate">{brew.recipe.title}</p>
                      <p className="text-xs text-coffee-500 mt-0.5">
                        {brew.recipe.method}{brew.recipe.difficulty ? ` · ${brew.recipe.difficulty}` : ''} · {new Date(brew.createdAt).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}
                      </p>
                      {brew.notes && <p className="text-sm text-coffee-700 dark:text-coffee-300 mt-2 line-clamp-2">{brew.notes}</p>}
                    </div>
                    <div className="text-right ml-4 shrink-0">
                      <p className="text-gold-400">{brew.rating}/10 <span className="text-coffee-500">★</span></p>
                      <p className="text-xs text-gold-500 mt-1">+{brew.xpEarned} XP</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profile.brewLogs.length === 0 && profile.achievements.length === 0 && (
          <div className="text-center py-12">
            <Coffee className="w-12 h-12 text-coffee-700 mx-auto mb-3" />
            <p className="text-coffee-500">Aún no hay brews registrados.</p>
            <p className="text-coffee-500 text-sm mt-1">¡Prepara tu primer café y regístralo!</p>
          </div>
        )}
      </div>
    </div>
  );
}
