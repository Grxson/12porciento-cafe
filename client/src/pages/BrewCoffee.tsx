import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Coffee } from 'lucide-react';
import { brewApi, api } from '@12porciento/shared';
import type { BrewRecipeStructured } from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';

interface CoffeeItem {
  id: string;
  slug: string;
  name: string;
  imageUrl: string;
  origin?: string | null;
  region?: string | null;
  variety?: string | null;
  process?: string | null;
  roastLevel?: string | null;
  altitude?: number | null;
  scaScore?: number | null;
  tastingNotes?: string | null;
  recommendedBrewMethod?: string | null;
  brewTemperature?: number | null;
  brewRatio?: string | null;
  grindSize?: string | null;
}

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

export default function BrewCoffee() {
  const { slug } = useParams<{ slug: string }>();

  const [coffee, setCoffee] = useState<CoffeeItem | null>(null);
  const [recipes, setRecipes] = useState<BrewRecipeStructured[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: CoffeeItem }>(`/products/${slug}`).then((r) => r.data.data),
      brewApi.getRecipesForCoffee(slug).then((r) => r.data.data).catch(() => []),
    ])
      .then(([c, r]) => {
        setCoffee(c);
        setRecipes(r);
      })
      .catch(() => setCoffee(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="h-64 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800" />
        </div>
      </div>
    );
  }

  if (!coffee) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Café no encontrado"
          description="Verifica el enlace o vuelve al catálogo."
          action={
            <Link to="/brew/cafes" className="btn-primary">
              Ver cafés
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/brew/cafes"
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-coffee-500 hover:text-gold-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Cafés
        </Link>

        <header className="mb-6 grid grid-cols-1 gap-6 sm:grid-cols-3">
          <div className="sm:col-span-1">
            <MediaFrame
              ratio="product"
              src={coffee.imageUrl}
              alt={coffee.name}
              className="rounded"
            />
          </div>
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
              Café
            </p>
            <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
              {coffee.name}
            </h1>
            {(coffee.origin || coffee.region) && (
              <p className="mt-2 text-sm text-coffee-600 dark:text-coffee-400">
                {[coffee.origin, coffee.region].filter(Boolean).join(' · ')}
              </p>
            )}
            <div className="mt-4 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-coffee-500">
              {coffee.variety && (
                <span className="rounded-full border border-coffee-200 px-2 py-0.5 dark:border-coffee-700">
                  {coffee.variety}
                </span>
              )}
              {coffee.process && (
                <span className="rounded-full border border-coffee-200 px-2 py-0.5 dark:border-coffee-700">
                  {coffee.process}
                </span>
              )}
              {coffee.roastLevel && (
                <span className="rounded-full border border-coffee-200 px-2 py-0.5 dark:border-coffee-700">
                  Tueste {coffee.roastLevel}
                </span>
              )}
              {coffee.altitude != null && (
                <span className="rounded-full border border-coffee-200 px-2 py-0.5 dark:border-coffee-700">
                  {coffee.altitude} msnm
                </span>
              )}
              {coffee.scaScore != null && (
                <span className="rounded-full border border-gold-500/40 bg-gold-500/10 px-2 py-0.5 text-gold-700 dark:text-gold-300">
                  SCA {coffee.scaScore}
                </span>
              )}
            </div>
            {coffee.tastingNotes && (
              <p className="mt-4 text-sm leading-relaxed text-coffee-700 dark:text-coffee-300">
                {coffee.tastingNotes}
              </p>
            )}
          </div>
        </header>

        {/* Recommended brew params */}
        {(coffee.recommendedBrewMethod || coffee.brewTemperature || coffee.brewRatio || coffee.grindSize) && (
          <section className="mb-8 border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
            <h2 className="mb-3 font-serif text-lg text-coffee-900 dark:text-cream">
              Recomendación del tostador
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {coffee.recommendedBrewMethod && (
                <Stat label="Método" value={coffee.recommendedBrewMethod} />
              )}
              {coffee.brewTemperature && (
                <Stat label="Temperatura" value={`${coffee.brewTemperature} °C`} />
              )}
              {coffee.brewRatio && <Stat label="Ratio" value={coffee.brewRatio} />}
              {coffee.grindSize && <Stat label="Molienda" value={coffee.grindSize} />}
            </div>
          </section>
        )}

        {/* Recipes for this coffee */}
        <section className="mb-8">
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">
              Preparar este café
            </h2>
          </div>

          {recipes.length === 0 ? (
            <EmptyState
              icon={<Coffee className="h-10 w-10" />}
              title="Sin recetas todavía"
              description="Aún no hemos publicado recetas para este café."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recipes.map((r) => (
                <Link
                  key={r.id}
                  to={`/brew/recetas/${r.slug}`}
                  className="group flex flex-col gap-2 border border-coffee-200 bg-white p-5 transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-coffee-700 dark:bg-coffee-800 dark:text-coffee-200">
                      {r.brewMethod?.name ?? r.method}
                    </span>
                    {r.profile && (
                      <span className="text-[10px] uppercase tracking-widest text-gold-600 dark:text-gold-400">
                        {PROFILE_LABEL[r.profile]}
                      </span>
                    )}
                  </div>
                  <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">{r.title}</h3>
                  {(r.coffeeDoseGrams || r.waterGrams) && (
                    <p className="text-xs text-coffee-500">
                      {r.coffeeDoseGrams} g · {r.waterGrams} g ·{' '}
                      {r.waterTemperatureCelsius ? `${r.waterTemperatureCelsius} °C` : ''}
                    </p>
                  )}
                  <div className="mt-2 flex items-center justify-end text-xs font-semibold text-gold-600 dark:text-gold-400">
                    Abrir <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-coffee-500">{label}</p>
      <p className="mt-0.5 font-serif text-base text-coffee-900 dark:text-cream">{value}</p>
    </div>
  );
}
