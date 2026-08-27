import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Clock, ThermometerSun, Scale } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { BrewRecipeStructured } from '@12porciento/shared';
import { useUser } from '../context/UserContext';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';
import RatioCalculator from '../components/brew/RatioCalculator';

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

export default function BrewRecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const user = useUser((s) => s.user);

  const [recipe, setRecipe] = useState<BrewRecipeStructured | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    brewApi
      .getRecipe(slug)
      .then((r) => setRecipe(r.data.data))
      .catch(() => setRecipe(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="h-64 animate-pulse rounded bg-coffee-100 dark:bg-coffee-800" />
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="px-4 py-16 sm:px-6 lg:px-8">
        <EmptyState
          title="Receta no encontrada"
          description="La receta que buscas no existe o no está publicada."
          action={
            <Link to="/brew/recetas" className="btn-primary">
              Ver recetas
            </Link>
          }
        />
      </div>
    );
  }

  const hasStructuredParams =
    recipe.coffeeDoseGrams != null && recipe.waterGrams != null;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/brew/recetas"
          className="mb-4 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-coffee-500 hover:text-gold-600"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Recetas
        </Link>

        {/* Header */}
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            {recipe.brewMethod?.name ?? recipe.method}
            {recipe.profile && ` · ${PROFILE_LABEL[recipe.profile]}`}
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            {recipe.title}
          </h1>
          {recipe.description && (
            <p className="mt-3 text-sm leading-relaxed text-coffee-600 dark:text-coffee-400">
              {recipe.description}
            </p>
          )}
        </header>

        {/* Hero image */}
        <MediaFrame
          ratio="banner"
          src={recipe.imageUrl ?? recipe.product?.imageUrl}
          alt={recipe.title}
          className="mb-6 rounded"
        />

        {/* Parameters */}
        {hasStructuredParams && (
          <section className="mb-8 grid grid-cols-3 gap-3 sm:gap-4">
            <ParamCard
              icon={<Scale className="h-5 w-5" />}
              label="Dosis"
              value={`${recipe.coffeeDoseGrams} g`}
            />
            <ParamCard
              icon={<Scale className="h-5 w-5" />}
              label="Agua"
              value={`${recipe.waterGrams} g`}
            />
            <ParamCard
              icon={<ThermometerSun className="h-5 w-5" />}
              label="Temperatura"
              value={recipe.waterTemperatureCelsius ? `${recipe.waterTemperatureCelsius} °C` : '—'}
            />
          </section>
        )}

        {/* Ratio Calculator */}
        {hasStructuredParams && recipe.coffeeDoseGrams != null && recipe.waterGrams != null && (
          <section className="mb-10">
            <RatioCalculator
              initialCoffee={recipe.coffeeDoseGrams}
              initialWater={recipe.waterGrams}
              ratio={recipe.ratio ?? Number((recipe.waterGrams / recipe.coffeeDoseGrams).toFixed(2))}
            />
          </section>
        )}

        {/* Steps */}
        <section className="mb-10">
          <h2 className="mb-4 font-serif text-2xl text-coffee-900 dark:text-cream">Pasos</h2>
          {recipe.steps.length === 0 ? (
            <p className="text-sm text-coffee-500">Esta receta aún no tiene pasos.</p>
          ) : (
            <ol className="space-y-3">
              {recipe.steps.map((s) => (
                <li
                  key={s.order}
                  className="border border-coffee-200 bg-white p-4 dark:border-coffee-800 dark:bg-coffee-900"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-500/10 text-xs font-bold text-gold-600 dark:text-gold-400">
                      {s.order}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-coffee-900 dark:text-cream">
                        {s.title ?? (s.type ?? 'Paso')}
                      </p>
                      {s.description && (
                        <p className="mt-1 text-sm leading-relaxed text-coffee-600 dark:text-coffee-400">
                          {s.description}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-widest text-coffee-500">
                        {s.duration ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {s.duration}s
                          </span>
                        ) : null}
                        {s.waterAmountGrams ? (
                          <span className="inline-flex items-center gap-1">
                            <Scale className="h-3 w-3" /> {s.waterAmountGrams} g
                          </span>
                        ) : null}
                        {s.targetTotalWaterGrams ? (
                          <span>→ {s.targetTotalWaterGrams} g</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* CTA */}
        {user && hasStructuredParams && (
          <div className="sticky bottom-4 z-20 flex justify-center">
            <Link
              to={`/brew/preparar?recipe=${recipe.slug}`}
              className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 text-base shadow-xl shadow-gold-500/30"
            >
              Preparar esta receta
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function ParamCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="border border-coffee-200 bg-white p-4 text-center dark:border-coffee-800 dark:bg-coffee-900">
      <div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
        {icon}
      </div>
      <p className="text-[10px] uppercase tracking-widest text-coffee-500">{label}</p>
      <p className="mt-1 font-serif text-xl text-coffee-900 dark:text-cream">{value}</p>
    </div>
  );
}
