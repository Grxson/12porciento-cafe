import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { CHANGELOG } from '../data/changelog';
import { PageMeta } from '../hooks/usePageMeta';

export default function Changelog() {
  return (
    <div className="min-h-dvh bg-coffee-50 px-4 py-10 dark:bg-coffee-950 sm:px-6 lg:px-8">
      <PageMeta title="Novedades" description="Historial de cambios de 12% Café." />
      <main className="mx-auto max-w-3xl">
        <Link
          to="/tienda"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-coffee-600 transition-colors hover:text-gold-500 dark:text-coffee-400"
        >
          <ArrowLeft className="h-4 w-4" /> Volver a la tienda
        </Link>

        <div className="mt-8 border border-coffee-200 bg-white p-6 dark:border-coffee-800 dark:bg-coffee-900 sm:p-8">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gold-500/40 bg-gold-500/10">
              <RefreshCw className="h-5 w-5 text-gold-500" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-gold-500">12% Café</p>
              <h1 className="mt-1 font-serif text-3xl text-coffee-900 dark:text-cream">
                Historial de cambios
              </h1>
            </div>
          </div>

          <div className="mt-8 space-y-8">
            {CHANGELOG.map((release) => (
              <section
                key={release.version}
                className="border-t border-coffee-200 pt-6 dark:border-coffee-800"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">
                    Versión {release.version}
                  </h2>
                  <span className="text-xs uppercase tracking-[0.18em] text-coffee-500 dark:text-coffee-400">
                    {release.date}
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {release.changes.map((change) => (
                    <li
                      key={change}
                      className="flex gap-2 text-sm leading-relaxed text-coffee-700 dark:text-coffee-300"
                    >
                      <span className="text-gold-500">•</span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
