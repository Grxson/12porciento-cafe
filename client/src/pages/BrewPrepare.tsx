import { Link } from 'react-router-dom';
import { Beaker, ArrowRight } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { BrewMethod, BrewRecipeStructured } from '@12porciento/shared';
import { useEffect, useState } from 'react';

export default function BrewPrepare() {
  const [methods, setMethods] = useState<BrewMethod[]>([]);
  const [recipes, setRecipes] = useState<BrewRecipeStructured[]>([]);

  useEffect(() => {
    Promise.all([
      brewApi.listMethods().then((r) => r.data.data).catch(() => []),
      brewApi.listRecipes({ pageSize: '12' }).then((r) => r.data.data).catch(() => []),
    ]).then(([m, r]) => {
      setMethods(m);
      setRecipes(r);
    });
  }, []);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Preparar
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            Elige un método
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-coffee-600 dark:text-coffee-400">
            Selecciona cómo vas a preparar tu café. Luego elegiremos una receta afín.
          </p>
        </header>

        {methods.length === 0 ? (
          <p className="text-sm text-coffee-500">Cargando métodos…</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {methods.map((m) => (
              <Link
                key={m.id}
                to={`/brew/recetas?method=${encodeURIComponent(m.name)}`}
                className="group flex flex-col items-center gap-2 rounded-lg border border-coffee-200 bg-white p-4 text-center transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:shadow-md dark:border-coffee-800 dark:bg-coffee-900"
              >
                <span className="grid h-12 w-12 place-items-center rounded-full bg-coffee-100 text-2xl transition-colors group-hover:bg-gold-500/10 dark:bg-coffee-800">
                  {m.icon || <Beaker className="h-5 w-5" />}
                </span>
                <p className="text-sm font-semibold text-coffee-900 dark:text-cream">{m.name}</p>
              </Link>
            ))}
          </div>
        )}

        <section className="mt-12">
          <div className="mb-5 flex items-end justify-between">
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">Recetas sugeridas</h2>
            <Link
              to="/brew/recetas"
              className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-widest text-gold-600 hover:text-gold-500 dark:text-gold-400"
            >
              Ver todas <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.slice(0, 6).map((r) => (
              <Link
                key={r.id}
                to={`/brew/recetas/${r.slug}`}
                className="group flex flex-col gap-2 border border-coffee-200 bg-white p-4 transition-all hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-900"
              >
                <p className="font-serif text-base text-coffee-900 dark:text-cream">{r.title}</p>
                <p className="text-xs text-coffee-500">
                  {r.brewMethod?.name ?? r.method}
                  {r.profile ? ` · ${r.profile}` : ''}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
