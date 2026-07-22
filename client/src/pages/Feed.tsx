import { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Star, Zap, Loader2, AlertCircle } from 'lucide-react';
import { baristaApi } from '../api';
import { useUser } from '../context/UserContext';
import BrewLikeButton from '../components/BrewLikeButton';
import FollowButton from '../components/FollowButton';
import { PageMeta } from '../hooks/usePageMeta';

/* ── Types ── */

interface FeedItem {
  id: string;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  recipeName: string;
  method: string;
  beanName: string | null;
  beanSlug: string | null;
  rating: number;
  notes: string | null;
  photoUrl: string | null;
  tags: string[];
  xpEarned: number;
  likeCount: number;
  isLiked: boolean;
  createdAt: string;
}

interface FeedMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

/* ── Helpers ── */

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'ahora';
  if (mins < 60) return `hace ${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `hace ${days}d`;
  return new Date(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
}

/* ── Skeleton ── */

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div
          key={i}
          className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-4 space-y-3"
        >
          {/* Header: avatar + name */}
          <div className="flex items-center gap-3">
            <div className="shimmer dark:shimmer-dark w-10 h-10 rounded-full shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="shimmer dark:shimmer-dark h-4 w-32" />
              <div className="shimmer dark:shimmer-dark h-3 w-20" />
            </div>
          </div>
          {/* Content lines */}
          <div className="shimmer dark:shimmer-dark h-4 w-3/4" />
          <div className="shimmer dark:shimmer-dark h-4 w-1/2" />
          {/* Photo placeholder */}
          <div className="shimmer dark:shimmer-dark h-40 w-full" />
          {/* Tags */}
          <div className="flex gap-2">
            <div className="shimmer dark:shimmer-dark h-6 w-14 rounded-full" />
            <div className="shimmer dark:shimmer-dark h-6 w-10 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Empty State ── */

function EmptyFeed() {
  return (
    <div className="text-center py-16 px-4">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-coffee-100 dark:bg-coffee-800 flex items-center justify-center">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="w-10 h-10 text-coffee-400 dark:text-coffee-500"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
          />
        </svg>
      </div>
      <h2 className="font-serif text-xl text-coffee-900 dark:text-cream mb-2">
        Sigue a otros baristas
      </h2>
      <p className="text-coffee-500 dark:text-coffee-400 text-sm mb-6 max-w-xs mx-auto">
        Sigue a otros baristas para ver su actividad aquí
      </p>
      <Link
        to="/leaderboard"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-coffee-900 font-medium text-sm transition-colors"
      >
        Ver ranking
      </Link>
    </div>
  );
}

/* ── Brew Card ── */

interface BrewCardProps {
  brew: FeedItem;
}

function BrewCard({ brew }: BrewCardProps) {
  const [notesExpanded, setNotesExpanded] = useState(false);
  const notesTruncated = brew.notes && brew.notes.length > 120 && !notesExpanded;

  return (
    <article className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden">
      {/* Header: author */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/perfil/barista/${brew.userId}`}
            className="shrink-0"
            aria-label={`Perfil de ${brew.authorName}`}
          >
            {brew.authorAvatar ? (
              <img
                src={brew.authorAvatar}
                alt={brew.authorName}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-coffee-200 dark:bg-coffee-700 flex items-center justify-center text-coffee-500 dark:text-coffee-400 text-sm font-bold">
                {brew.authorName.charAt(0).toUpperCase()}
              </div>
            )}
          </Link>
          <div className="min-w-0">
            <Link
              to={`/perfil/barista/${brew.userId}`}
              className="text-sm font-medium text-coffee-900 dark:text-cream hover:text-gold-500 dark:hover:text-gold-400 transition-colors truncate block"
            >
              {brew.authorName}
            </Link>
            <span className="text-xs text-coffee-400 dark:text-coffee-500">
              {timeAgo(brew.createdAt)}
            </span>
          </div>
        </div>
        <FollowButton targetUserId={brew.userId} targetUserName={brew.authorName} size="sm" />
      </div>

      {/* Recipe + method */}
      <div className="px-4 pb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-medium text-coffee-900 dark:text-cream">{brew.recipeName}</h3>
          <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-coffee-100 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400 rounded-full">
            {brew.method}
          </span>
        </div>
      </div>

      {/* Bean name */}
      {brew.beanName && (
        <div className="px-4 pb-2">
          {brew.beanSlug ? (
            <Link
              to={`/tienda/${brew.beanSlug}`}
              className="text-xs text-gold-500 hover:text-gold-400 transition-colors"
            >
              ☕ {brew.beanName}
            </Link>
          ) : (
            <span className="text-xs text-coffee-500 dark:text-coffee-400">☕ {brew.beanName}</span>
          )}
        </div>
      )}

      {/* Rating */}
      {brew.rating > 0 && (
        <div className="px-4 pb-2 flex items-center gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="w-4 h-4"
              fill={i < brew.rating ? '#D4A017' : 'none'}
              stroke={i < brew.rating ? '#D4A017' : '#A09080'}
              aria-hidden="true"
            />
          ))}
          <span className="text-xs text-coffee-400 dark:text-coffee-500 ml-1">{brew.rating}/5</span>
        </div>
      )}

      {/* Notes */}
      {brew.notes && (
        <div className="px-4 pb-2">
          <p
            className={`text-sm text-coffee-700 dark:text-coffee-300 leading-relaxed ${
              notesTruncated ? 'line-clamp-3' : ''
            }`}
          >
            {brew.notes}
          </p>
          {notesTruncated && (
            <button
              onClick={() => setNotesExpanded(true)}
              className="text-xs text-gold-500 hover:text-gold-400 mt-1 transition-colors"
            >
              Ver más
            </button>
          )}
          {notesExpanded && brew.notes.length > 120 && (
            <button
              onClick={() => setNotesExpanded(false)}
              className="text-xs text-gold-500 hover:text-gold-400 mt-1 transition-colors"
            >
              Ver menos
            </button>
          )}
        </div>
      )}

      {/* Photo */}
      {brew.photoUrl && (
        <div className="px-4 pb-2">
          <img
            src={brew.photoUrl}
            alt={`Foto de ${brew.recipeName}`}
            className="w-full max-h-80 object-cover rounded"
            loading="lazy"
          />
        </div>
      )}

      {/* Tags */}
      {brew.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {brew.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium bg-coffee-100 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer: XP + like */}
      <div className="flex items-center justify-between px-4 py-2.5 border-t border-coffee-100 dark:border-coffee-800">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-gold-500">
          <Zap className="w-3.5 h-3.5" fill="currentColor" />+{brew.xpEarned} XP
        </span>
        <BrewLikeButton
          brewId={brew.id}
          initialLiked={brew.isLiked}
          initialCount={brew.likeCount}
          size="sm"
        />
      </div>
    </article>
  );
}

/* ── Feed Page ── */

export default function Feed() {
  const user = useUser((s) => s.user);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [meta, setMeta] = useState<FeedMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cursorRef = useRef<string | undefined>(undefined);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchFeed = useCallback(async (cursor?: string, append = false) => {
    try {
      const res = await baristaApi.getFeed({ cursor, limit: 15 });
      const data: FeedItem[] = res.data.data;
      const nextMeta: FeedMeta = res.data.meta;

      setItems((prev) => (append ? [...prev, ...data] : data));
      setMeta(nextMeta);
      cursorRef.current = nextMeta.nextCursor ?? undefined;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al cargar el feed';
      setError(msg);
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    setError(null);
    cursorRef.current = undefined;
    fetchFeed().finally(() => setLoading(false));
  }, [fetchFeed]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    if (!meta?.hasMore || loadingMore || loading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && meta.hasMore && !loadingMore) {
          setLoadingMore(true);
          fetchFeed(cursorRef.current, true)
            .catch(() => {})
            .finally(() => setLoadingMore(false));
        }
      },
      { rootMargin: '200px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [meta, loadingMore, loading, fetchFeed]);

  // Not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
        <PageMeta title="Feed" description="Actividad de baristas que sigues en 12% Café." />
        <div className="max-w-lg mx-auto px-4">
          <div className="text-center py-16">
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">
              Inicia sesión para ver tu feed.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-gold-500 hover:bg-gold-400 text-coffee-900 font-medium text-sm transition-colors"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 pt-20 pb-24">
      <PageMeta title="Feed" description="Actividad de baristas que sigues en 12% Café." />
      <div className="max-w-lg mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Social</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">Feed</h1>
          <p className="text-coffee-600 dark:text-coffee-400 text-sm">
            Actividad de baristas que sigues
          </p>
        </div>

        {/* Loading */}
        {loading && <FeedSkeleton />}

        {/* Error */}
        {!loading && error && (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">{error}</p>
            <button
              onClick={() => {
                setError(null);
                setLoading(true);
                cursorRef.current = undefined;
                fetchFeed().finally(() => setLoading(false));
              }}
              className="text-xs text-gold-500 hover:text-gold-400 mt-2 underline"
              aria-label="Reintentar carga del feed"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && items.length === 0 && <EmptyFeed />}

        {/* Feed list */}
        {!loading && !error && items.length > 0 && (
          <div className="space-y-4">
            {items.map((brew) => (
              <BrewCard key={brew.id} brew={brew} />
            ))}

            {/* Infinite scroll sentinel */}
            <div ref={sentinelRef} className="h-1" />

            {/* Loading more spinner */}
            {loadingMore && (
              <div className="flex justify-center py-6">
                <Loader2 className="w-6 h-6 text-gold-500 animate-spin" aria-label="Cargando más" />
              </div>
            )}

            {/* End of feed */}
            {meta && !meta.hasMore && items.length > 0 && (
              <p className="text-center text-xs text-coffee-400 dark:text-coffee-500 py-4">
                Has visto todo
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
