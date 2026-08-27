/**
 * 12% Brew — Home
 *
 * Landing page for the 12% Brew module. Sections:
 *   1. Hero + primary CTA "Preparar café"
 *   2. Continue brewing (last session, if any)
 *   3. Methods grid
 *   4. Featured recipes
 *   5. Recent brews (last 3)
 *
 * Mobile-first. Lazy-loaded route.
 */

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coffee,
  ArrowRight,
  PlayCircle,
  Star,
  Clock,
  ChevronRight,
  Beaker,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { brewApi } from '@12porciento/shared';
import type {
  BrewMethod,
  BrewRecipeStructured,
  BrewSession,
} from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';
import ErrorState from '../components/ui/ErrorState';

const CATEGORY_LABEL: Record<string, string> = {
  POUR_OVER: 'Vertido',
  IMMERSION: 'Inmersión',
  PRESSURE: 'Presión',
  STOVETOP: 'Estufa',
  COLD: 'Frío',
  TRADITIONAL: 'Tradicional',
  EVALUATION: 'Catación',
};

const PROFILE_LABEL: Record<string, string> = {
  BALANCED: 'Balanceado',
  SWEET: 'Dulce',
  BRIGHT: 'Brillante',
  FRUITY: 'Frutal',
  FLORAL: 'Floral',
  FULL_BODY: 'Cuerpo',
  CLEAN: 'Limpio',
  INTENSE: 'Intenso',
  REFRESHING: 'Refrescante',
  EXPERIMENTAL: 'Experimental',
};

export default function BrewHome() {
  const user = useUser((s) => s.user);

  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [featured, setFeatured] = useState<BrewRecipeStructured[]>([]);
  const [recent, setRecent] = useState<BrewSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setError(null);
    setLoading(true);
    let cancelled = false;
    Promise.all([
      brewApi.listMethods().then((r) => r.data.data),
      brewApi
        .listRecipes({ featured: 'true', pageSize: '6' })
        .then((r) => r.data.data),
      user
        ? brewApi.listSessions({ pageSize: '3' }).then((r) => r.data.data)
        : Promise.resolve([] as BrewSession[]),
    ])
      .then(([m, f, r]) => {
        if (cancelled) return;
        setMethods(m);
        setFeatured(f);
        setRecent(r);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('BrewHome load error:', err);
        setError('No pudimos cargar 12% Brew. Revisa tu conexión.');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }

  useEffect(() => {
    return load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const lastSession = recent[0];

  if (error && !loading) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <ErrorState
            title="No pudimos cargar 12% Brew"
            description={error}
            onRetry={load}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="brew-home">
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className="px-4 pt-6 pb-10 sm:px-6 sm:pt-10 lg:px-8 lg:pt-14 lg:pb-16">
        <div className="mx-auto max-w-7xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              12% Brew
            </p>
            <h1 className="mt-3 font-serif text-3xl leading-tight text-coffee-950 dark:text-cream sm:text-4xl md:text-5xl">
              Tengo este café y este equipo.
              <br className="hidden sm:inline" />
              <span className="text-gold-600 dark:text-gold-400"> ¿Cómo lo preparo?</span>
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-coffee-600 dark:text-coffee-400 sm:text-lg">
              Encuentra recetas estructuradas, ajusta la dosis a tu medida, sigue cada vertido con
              un temporizador claro y aprende de cada preparación.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/brew/preparar"
                className="btn-primary group inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base shadow-lg shadow-gold-500/20 transition-all hover:shadow-xl hover:shadow-gold-500/30"
              >
                <PlayCircle className="h-5 w-5" />
                Preparar café
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/brew/recetas"
                className="inline-flex items-center justify-center gap-2 border border-coffee-300 px-7 py-3.5 text-base font-medium text-coffee-800 transition-colors hover:bg-coffee-100 dark:border-coffee-700 dark:text-coffee-200 dark:hover:bg-coffee-800"
              >
                Explorar recetas
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Continue brewing ────────────────────────────────────── */}
      {lastSession && (
        <section className="border-t border-coffee-200/60 bg-coffee-100/40 px-4 py-8 dark:border-coffee-800/60 dark:bg-coffee-900/30 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream sm:text-2xl">
              Continuar preparando
            </h2>
            <Link
              to={`/brew/sesiones/${lastSession.id}`}
              className="mt-4 flex items-center gap-4 border border-coffee-200 bg-white p-4 transition-colors hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-950 sm:p-5"
            >
              <MediaFrame
                ratio="product"
                src={lastSession.coffee?.imageUrl}
                alt={lastSession.coffee?.name ?? 'Café'}
                className="h-16 w-16 shrink-0 rounded sm:h-20 sm:w-20"
              />
              <div className="min-w-0 flex-1">
                <p className="font-serif text-base text-coffee-900 dark:text-cream sm:text-lg">
                  {lastSession.recipe?.title ?? 'Receta libre'}
                  {lastSession.coffee && (
                    <span className="text-coffee-500 dark:text-coffee-400">
                      {' '}
                      · {lastSession.coffee.name}
                    </span>
                  )}
                </p>
                <p className="mt-1 truncate text-xs text-coffee-500 dark:text-coffee-400">
                  {lastSession.brewMethod?.name ?? 'Método libre'}
                  {lastSession.coffeeDoseGrams && lastSession.waterGrams && (
                    <>
                      {' · '}
                      {lastSession.coffeeDoseGrams} g · {lastSession.waterGrams} g ·{' '}
                      1:{lastSession.ratio}
                    </>
                  )}
                </p>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-coffee-400" />
            </Link>
          </div>
        </section>
      )}

      {/* ── Methods ─────────────────────────────────────────────── */}
      <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader title="Métodos" subtitle="Elige cómo quieres preparar." />
          {loading && methods.length === 0 ? (
            <SkeletonGrid count={6} />
          ) : methods.length === 0 ? (
            <EmptyState
              icon={<Coffee className="h-10 w-10" />}
              title="Aún no hay métodos"
              description="El catálogo se está preparando. Vuelve pronto."
            />
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-6">
              {methods.slice(0, 12).map((m) => (
                <Link
                  key={m.id}
                  to={`/brew/recetas?method=${encodeURIComponent(m.name)}`}
                  className="group flex flex-col items-center gap-2 rounded-lg border border-coffee-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900 dark:hover:border-gold-400"
                >
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-coffee-100 text-2xl transition-colors group-hover:bg-gold-500/10 dark:bg-coffee-800">
                    {m.icon || '☕'}
                  </span>
                  <p className="text-sm font-semibold text-coffee-900 dark:text-cream">{m.name}</p>
                  <p className="text-[10px] uppercase tracking-wider text-coffee-500">
                    {CATEGORY_LABEL[m.category] ?? m.category}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Featured recipes ───────────────────────────────────── */}
      <section className="border-t border-coffee-200/60 bg-coffee-100/40 px-4 py-12 dark:border-coffee-800/60 dark:bg-coffee-900/30 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-7xl">
          <SectionHeader
            title="Recetas destacadas"
            subtitle="Perfiles afinados por nuestro equipo."
            action={
              <Link
                to="/brew/recetas"
                className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
              >
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {loading && featured.length === 0 ? (
            <SkeletonGrid count={3} tall />
          ) : featured.length === 0 ? (
            <EmptyState
              icon={<Beaker className="h-10 w-10" />}
              title="Aún no hay recetas destacadas"
              description="Publica tus primeras recetas para verlas aquí."
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((r) => (
                <Link
                  key={r.id}
                  to={`/brew/recetas/${r.slug}`}
                  className="group flex flex-col overflow-hidden border border-coffee-200 bg-white transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-lg dark:border-coffee-800 dark:bg-coffee-950"
                >
                  <MediaFrame
                    ratio="recipe"
                    src={r.imageUrl ?? r.product?.imageUrl}
                    alt={r.title}
                  />
                  <div className="flex flex-1 flex-col gap-2 p-5">
                    <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-coffee-500">
                      {r.brewMethod?.name && <span>{r.brewMethod.name}</span>}
                      {r.profile && (
                        <>
                          <span>·</span>
                          <span className="text-gold-600 dark:text-gold-400">
                            {PROFILE_LABEL[r.profile]}
                          </span>
                        </>
                      )}
                    </div>
                    <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">
                      {r.title}
                    </h3>
                    {(r.coffeeDoseGrams || r.waterGrams) && (
                      <p className="text-xs text-coffee-500 dark:text-coffee-400">
                        {r.coffeeDoseGrams} g café · {r.waterGrams} g agua ·{' '}
                        {r.waterTemperatureCelsius} °C
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── Recent brews ───────────────────────────────────────── */}
      {user && (
        <section className="px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-7xl">
            <SectionHeader
              title="Últimas preparaciones"
              subtitle="Tu historial reciente."
              action={
                <Link
                  to="/brew/sesiones"
                  className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
                >
                  Ver todas <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              }
            />
            {recent.length === 0 ? (
              <EmptyState
                icon={<Star className="h-10 w-10" />}
                title="Aún no tienes preparaciones"
                description="Inicia una sesión y empezaremos a registrar tu progreso."
                action={
                  <Link to="/brew/preparar" className="btn-primary">
                    Preparar café
                  </Link>
                }
              />
            ) : (
              <div className="space-y-3">
                {recent.map((s) => (
                  <Link
                    key={s.id}
                    to={`/brew/sesiones/${s.id}`}
                    className="flex items-center gap-4 border border-coffee-200 bg-white p-3 transition-colors hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-950 sm:p-4"
                  >
                    <MediaFrame
                      ratio="avatar"
                      src={s.coffee?.imageUrl}
                      alt={s.coffee?.name ?? 'Café'}
                      className="h-12 w-12 shrink-0 rounded sm:h-14 sm:w-14"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-coffee-900 dark:text-cream">
                        {s.recipe?.title ?? 'Receta libre'}
                        {s.coffee && (
                          <span className="text-coffee-500"> · {s.coffee.name}</span>
                        )}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-coffee-500">
                        <Clock className="h-3 w-3" />
                        {new Date(s.createdAt).toLocaleDateString('es-MX')}
                        {s.rating != null && (
                          <span className="inline-flex items-center gap-0.5">
                            <Star className="h-3 w-3 fill-gold-500 text-gold-500" />
                            {s.rating}/5
                          </span>
                        )}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-coffee-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

// ─── Local helpers ──────────────────────────────────────────────────

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
      <div>
        <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream sm:text-3xl">{title}</h2>
        {subtitle && (
          <p className="mt-1 text-sm text-coffee-600 dark:text-coffee-400">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function SkeletonGrid({ count, tall }: { count: number; tall?: boolean }) {
  return (
    <div
      className={`grid gap-3 sm:gap-4 ${
        tall ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
      }`}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse rounded bg-coffee-100 dark:bg-coffee-800 ${
            tall ? 'h-64' : 'h-28'
          }`}
        />
      ))}
    </div>
  );
}
