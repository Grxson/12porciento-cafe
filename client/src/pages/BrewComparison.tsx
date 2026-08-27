/**
 * 12% Brew — Comparar dos sesiones
 *
 * Usage: /brew/comparar?ids=<id1>,<id2>
 * Highlights the variables that actually changed between the two brews
 * (per spec §23) — only diffs are emphasized, common values are dimmed.
 */

import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeftRight, AlertCircle } from 'lucide-react';
import { brewApi } from '@12porciento/shared';
import type { BrewSession } from '@12porciento/shared';
import MediaFrame from '../components/ui/MediaFrame';
import EmptyState from '../components/ui/EmptyState';

interface Row {
  label: string;
  a: string;
  b: string;
  changed: boolean;
  delta?: string;
}

export default function BrewComparison() {
  const [searchParams] = useSearchParams();
  const ids = (searchParams.get('ids') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const [a, setA] = useState<BrewSession | null>(null);
  const [b, setB] = useState<BrewSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ids.length !== 2) {
      setLoading(false);
      setError('Selecciona exactamente 2 preparaciones para comparar.');
      return;
    }
    setLoading(true);
    Promise.all([brewApi.getSession(ids[0]), brewApi.getSession(ids[1])])
      .then(([ra, rb]) => {
        setA(ra.data.data);
        setB(rb.data.data);
      })
      .catch((err) => {
        setError('No se pudieron cargar las sesiones.');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [ids[0], ids[1]]);

  if (loading) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <p className="text-sm text-coffee-500">Cargando comparación…</p>
      </div>
    );
  }

  if (error || !a || !b) {
    return (
      <div className="px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <EmptyState
            icon={<AlertCircle className="h-10 w-10" />}
            title={error ?? 'Sin datos'}
            description="Vuelve a Mis preparaciones y elige dos sesiones."
            action={
              <Link to="/brew/sesiones" className="btn-primary">
                Mis preparaciones
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const rows: Row[] = [
    {
      label: 'Café',
      a: a.coffee?.name ?? '—',
      b: b.coffee?.name ?? '—',
      changed: (a.coffee?.id ?? null) !== (b.coffee?.id ?? null),
    },
    {
      label: 'Receta',
      a: a.recipe?.title ?? '—',
      b: b.recipe?.title ?? '—',
      changed: (a.recipe?.id ?? null) !== (b.recipe?.id ?? null),
    },
    {
      label: 'Método',
      a: a.brewMethod?.name ?? '—',
      b: b.brewMethod?.name ?? '—',
      changed: (a.brewMethodId ?? null) !== (b.brewMethodId ?? null),
    },
    {
      label: 'Dosis',
      a: a.coffeeDoseGrams != null ? `${a.coffeeDoseGrams} g` : '—',
      b: b.coffeeDoseGrams != null ? `${b.coffeeDoseGrams} g` : '—',
      changed: a.coffeeDoseGrams !== b.coffeeDoseGrams,
      delta: diff(a.coffeeDoseGrams, b.coffeeDoseGrams, 'g'),
    },
    {
      label: 'Agua',
      a: a.waterGrams != null ? `${a.waterGrams} g` : '—',
      b: b.waterGrams != null ? `${b.waterGrams} g` : '—',
      changed: a.waterGrams !== b.waterGrams,
      delta: diff(a.waterGrams, b.waterGrams, 'g'),
    },
    {
      label: 'Ratio',
      a: a.ratio != null ? `1:${a.ratio}` : '—',
      b: b.ratio != null ? `1:${b.ratio}` : '—',
      changed: a.ratio !== b.ratio,
    },
    {
      label: 'Temperatura',
      a: a.temperatureCelsius != null ? `${a.temperatureCelsius} °C` : '—',
      b: b.temperatureCelsius != null ? `${b.temperatureCelsius} °C` : '—',
      changed: a.temperatureCelsius !== b.temperatureCelsius,
      delta: diff(a.temperatureCelsius, b.temperatureCelsius, ' °C'),
    },
    {
      label: 'Molienda',
      a: a.grindSetting ?? '—',
      b: b.grindSetting ?? '—',
      changed: (a.grindSetting ?? '') !== (b.grindSetting ?? ''),
    },
    {
      label: 'Tiempo',
      a: a.brewTimeSeconds != null ? formatTime(a.brewTimeSeconds) : '—',
      b: b.brewTimeSeconds != null ? formatTime(b.brewTimeSeconds) : '—',
      changed: a.brewTimeSeconds !== b.brewTimeSeconds,
      delta: diff(a.brewTimeSeconds, b.brewTimeSeconds, 's'),
    },
    {
      label: 'Rating',
      a: a.rating != null ? `${a.rating}/5` : '—',
      b: b.rating != null ? `${b.rating}/5` : '—',
      changed: a.rating !== b.rating,
    },
    {
      label: 'Resultado',
      a: a.result ?? '—',
      b: b.result ?? '—',
      changed: a.result !== b.result,
    },
    {
      label: 'Fecha',
      a: new Date(a.createdAt).toLocaleDateString('es-MX'),
      b: new Date(b.createdAt).toLocaleDateString('es-MX'),
      changed: false,
    },
  ];

  const changedCount = rows.filter((r) => r.changed).length;

  return (
    <div className="px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-600 dark:text-gold-400">
            Comparar
          </p>
          <h1 className="mt-2 font-serif text-3xl text-coffee-900 dark:text-cream sm:text-4xl">
            {rows.filter((r) => r.changed).length} variable{changedCount === 1 ? '' : 's'} cambiaron
          </h1>
          <p className="mt-1 text-xs text-coffee-500">
            Resaltamos únicamente lo que difiere entre las dos preparaciones.
          </p>
        </header>

        {/* Header cards */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <SessionCard label="A" session={a} />
          <SessionCard label="B" session={b} />
        </div>

        {/* Diff table */}
        <section className="overflow-hidden rounded border border-coffee-200 dark:border-coffee-800">
          <table className="w-full text-sm">
            <thead className="bg-coffee-100 text-coffee-700 dark:bg-coffee-900 dark:text-coffee-200">
              <tr>
                <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-widest">
                  Variable
                </th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest">
                  A
                </th>
                <th className="px-4 py-2 text-center text-[10px] font-semibold uppercase tracking-widest">
                  B
                </th>
                <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-widest">
                  Δ
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.label}
                  className={`border-t border-coffee-200 dark:border-coffee-800 ${
                    row.changed ? 'bg-gold-500/5' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-coffee-700 dark:text-coffee-300">{row.label}</td>
                  <td
                    className={`px-4 py-3 text-center ${
                      row.changed
                        ? 'font-semibold text-coffee-900 dark:text-cream'
                        : 'text-coffee-500'
                    }`}
                  >
                    {row.a}
                  </td>
                  <td
                    className={`px-4 py-3 text-center ${
                      row.changed
                        ? 'font-semibold text-coffee-900 dark:text-cream'
                        : 'text-coffee-500'
                    }`}
                  >
                    {row.b}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {row.delta ? (
                      <span className="font-mono text-xs font-semibold text-gold-700 dark:text-gold-300">
                        {row.delta}
                      </span>
                    ) : (
                      <span className="text-coffee-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Changes summary */}
        {changedCount > 0 && (
          <section className="mt-6 border-l-4 border-gold-500 bg-gold-500/5 p-4">
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-gold-700 dark:text-gold-300">
              <ArrowLeftRight className="h-3.5 w-3.5" /> Cambios detectados
            </div>
            <ul className="space-y-1 text-sm text-coffee-800 dark:text-coffee-200">
              {rows
                .filter((r) => r.changed)
                .map((r) => (
                  <li key={r.label}>
                    <strong>{r.label}:</strong> {r.a} → {r.b}
                    {r.delta && (
                      <span className="ml-2 font-mono text-xs text-gold-700 dark:text-gold-300">
                        ({r.delta})
                      </span>
                    )}
                  </li>
                ))}
            </ul>
          </section>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <Link to={`/brew/sesiones/${a.id}`} className="border border-coffee-200 px-4 py-2 text-sm dark:border-coffee-700">
            Ver sesión A
          </Link>
          <Link to={`/brew/sesiones/${b.id}`} className="border border-coffee-200 px-4 py-2 text-sm dark:border-coffee-700">
            Ver sesión B
          </Link>
          <Link to="/brew/dial-in" className="btn-primary inline-flex items-center gap-2">
            Aplicar dial-in
          </Link>
        </div>
      </div>
    </div>
  );
}

function SessionCard({ label, session }: { label: string; session: BrewSession }) {
  return (
    <Link
      to={`/brew/sesiones/${session.id}`}
      className="group flex items-center gap-3 border border-coffee-200 bg-white p-3 transition-colors hover:border-gold-400 dark:border-coffee-800 dark:bg-coffee-950"
    >
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold-500/10 font-mono text-xs font-bold text-gold-600 dark:text-gold-400">
        {label}
      </span>
      <MediaFrame
        ratio="avatar"
        src={session.coffee?.imageUrl}
        alt={session.coffee?.name ?? 'Café'}
        className="h-10 w-10 shrink-0 rounded"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-coffee-900 dark:text-cream">
          {session.recipe?.title ?? 'Receta libre'}
        </p>
        <p className="truncate text-xs text-coffee-500">
          {session.coffee?.name ?? 'Sin café'} · {session.brewMethod?.name ?? 'Método libre'}
        </p>
      </div>
    </Link>
  );
}

function diff(
  a: number | null | undefined,
  b: number | null | undefined,
  unit: string,
): string | undefined {
  if (a == null || b == null) return undefined;
  const d = Number((b - a).toFixed(2));
  if (d === 0) return undefined;
  const sign = d > 0 ? '+' : '';
  return `${sign}${d}${unit}`;
}

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
