/**
 * 12% Brew — Dial-in
 *
 * User picks the dominant result of their last brew. The server's
 * DialInEngine returns ONE primary recommendation + supporting suggestions.
 * From here the user can create a variant of the original recipe.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Beaker, Lightbulb, Plus, ArrowRight } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { DialInRecommendation, BrewSessionResult } from '@12porciento/shared';

const RESULTS: { value: BrewSessionResult; label: string; emoji: string }[] = [
  { value: 'SOUR', label: 'Muy ácido', emoji: '😖' },
  { value: 'BITTER', label: 'Muy amargo', emoji: '😖' },
  { value: 'WATERY', label: 'Débil / aguado', emoji: '💧' },
  { value: 'STRONG', label: 'Muy fuerte', emoji: '💪' },
  { value: 'ASTRINGENT', label: 'Astringente / seco', emoji: '🏜️' },
  { value: 'BALANCED', label: 'Bueno', emoji: '🙂' },
  { value: 'EXCELLENT', label: 'Excelente', emoji: '🌟' },
];

export default function BrewDialIn() {
  const [searchParams] = useSearchParams();
  const initialResult = (searchParams.get('result') as BrewSessionResult | null) ?? null;
  const sessionId = searchParams.get('session') || null;

  const [selected, setSelected] = useState<BrewSessionResult | null>(initialResult);
  const [rec, setRec] = useState<DialInRecommendation | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selected) {
      setRec(null);
      return;
    }
    setLoading(true);
    brewApi
      .dialIn('ad-hoc', { result: selected })
      .then((r) => setRec(r.data.data))
      .catch(() => setRec(null))
      .finally(() => setLoading(false));
  }, [selected]);

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Dial-in
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            Mejorar la siguiente taza
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-coffee-600 dark:text-coffee-400">
            ¿Cómo quedó tu última preparación? Elige la señal dominante — te diremos cuál es la
            <span className="font-semibold"> única </span>
            variable que建议你 cambiar primero.
          </p>
        </header>

        {/* Result picker */}
        <div className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RESULTS.map((r) => {
            const active = selected === r.value;
            return (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelected(r.value)}
                className={`flex flex-col items-center gap-1 border p-3 text-center transition-all ${
                  active
                    ? 'border-gold-500 bg-gold-500/10 shadow-sm'
                    : 'border-coffee-200 bg-white hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-900'
                }`}
              >
                <span className="text-xl">{r.emoji}</span>
                <span className="text-xs font-semibold text-coffee-900 dark:text-cream">
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Recommendation */}
        {selected && (
          <section className="border border-coffee-200 bg-white p-6 dark:border-coffee-800 dark:bg-coffee-900">
            {loading ? (
              <p className="text-sm text-coffee-500">Calculando recomendación…</p>
            ) : rec ? (
              <>
                <div className="mb-4 flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
                    <Lightbulb className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                      Cambio principal
                    </p>
                    <p className="mt-1 font-serif text-lg text-coffee-900 dark:text-cream">
                      {rec.primaryChange}
                    </p>
                    <p className="mt-2 text-xs leading-relaxed text-coffee-600 dark:text-coffee-400">
                      {rec.reason}
                    </p>
                  </div>
                </div>

                {rec.suggestions.length > 0 && (
                  <div className="mb-4 border-t border-coffee-200 pt-4 dark:border-coffee-800">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
                      Sugerencias adicionales
                    </p>
                    <ul className="space-y-1.5 text-sm text-coffee-700 dark:text-coffee-300">
                      {rec.suggestions.map((s, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-gold-500" />
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="border-t border-coffee-200 pt-3 text-[11px] italic text-coffee-500 dark:border-coffee-800">
                  Principio: cambia <strong>solo una variable</strong> por intento.
                </p>

                {sessionId && (
                  <div className="mt-5 flex flex-wrap gap-3 border-t border-coffee-200 pt-4 dark:border-coffee-800">
                    <Link
                      to={`/brew/sesiones/${sessionId}`}
                      className="inline-flex items-center gap-2 border border-coffee-200 px-4 py-2 text-sm font-semibold text-coffee-700 hover:border-gold-400 dark:border-coffee-700 dark:text-coffee-200"
                    >
                      Volver a la sesión
                    </Link>
                    <Link
                      to={`/brew/preparar?session=${sessionId}`}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Plus className="h-4 w-4" /> Repetir con cambio
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-coffee-500">No se pudo generar recomendación.</p>
            )}
          </section>
        )}

        {!selected && (
          <div className="rounded border border-dashed border-coffee-300 p-8 text-center dark:border-coffee-700">
            <Beaker className="mx-auto mb-2 h-8 w-8 text-coffee-400" />
            <p className="text-sm text-coffee-500">Selecciona arriba cómo quedó tu café.</p>
          </div>
        )}
      </div>
    </div>
  );
}
