/**
 * 12% Brew — DialInEngine
 *
 * Deterministic, testable, explainable dial-in recommendations based on
 * a single dominant signal (the result the user reports). Designed to be
 * swapped behind a `DialInProvider` interface when an AI provider arrives
 * in Phase 2 — current implementation is pure rules.
 *
 * Principle: change ONE main variable per attempt (see spec §21).
 */

export type BrewSessionResult =
  | 'SOUR'
  | 'BITTER'
  | 'WATERY'
  | 'STRONG'
  | 'ASTRINGENT'
  | 'UNDEREXTRACTED'
  | 'OVEREXTRACTED'
  | 'BALANCED'
  | 'GOOD'
  | 'EXCELLENT';

export interface DialInInput {
  result: BrewSessionResult;
  current?: {
    grindSetting?: string | null;
    temperatureCelsius?: number | null;
    coffeeDoseGrams?: number | null;
    waterGrams?: number | null;
    ratio?: number | null;
    brewTimeSeconds?: number | null;
    agitation?: 'low' | 'medium' | 'high' | null;
  };
}

export interface DialInRecommendation {
  /** One-line user-facing change. */
  primaryChange: string;
  /** Why we recommend it (short). */
  reason: string;
  /** Stable code for analytics + tests. */
  reasonCode: string;
  /** Optional list of secondary suggestions. */
  suggestions: string[];
}

const GOOD_RESULTS: BrewSessionResult[] = ['BALANCED', 'GOOD', 'EXCELLENT'];

export function isGoodResult(result: BrewSessionResult): boolean {
  return GOOD_RESULTS.includes(result);
}

/** Main entrypoint. */
export function recommend(input: DialInInput): DialInRecommendation {
  const { result, current = {} } = input;

  if (isGoodResult(result)) {
    return {
      primaryChange: 'Mantén tu receta igual — ya está funcionando.',
      reason: 'Tu calificación indica balance. Repetir con la misma molienda y mismos parámetros es lo correcto.',
      reasonCode: 'HOLD',
      suggestions: [
        'Anota los parámetros exactos en Mis preparaciones para repetirlos.',
        'Prueba el mismo café con otro método para mapear sus posibilidades.',
      ],
    };
  }

  switch (result) {
    case 'SOUR':
    case 'UNDEREXTRACTED':
      return recommendSour(current);
    case 'BITTER':
    case 'OVEREXTRACTED':
      return recommendBitter(current);
    case 'WATERY':
      return recommendWatery(current);
    case 'STRONG':
      return recommendStrong(current);
    case 'ASTRINGENT':
      return recommendAstringent(current);
    default:
      return {
        primaryChange: 'Repite la preparación con los mismos parámetros.',
        reason: 'Resultado sin coincidencia clara — repite antes de cambiar variables.',
        reasonCode: 'UNKNOWN',
        suggestions: [],
      };
  }
}

// ─── Per-result rules ──────────────────────────────────────────────────

function recommendSour(current: DialInInput['current']): DialInRecommendation {
  return {
    primaryChange: 'Muele ligeramente más fino.',
    reason: 'Un café marcadamente ácido suele indicar subextracción — el agua no logra extraer los compuestos dulces.',
    reasonCode: 'GRIND_FINER',
    suggestions: [
      bumpTemp(current),
      bumpContactTime(current),
      bumpRatioAgitation(current),
    ].filter(Boolean) as string[],
  };
}

function recommendBitter(current: DialInInput['current']): DialInRecommendation {
  return {
    primaryChange: 'Muele ligeramente más grueso.',
    reason: 'Amargor o astringencia alta sugiere sobreextracción — el agua permanece demasiado tiempo en contacto con el café.',
    reasonCode: 'GRIND_COARSER',
    suggestions: [dropTemp(current), dropContactTime(current), keepAgitation(current)].filter(
      Boolean,
    ) as string[],
  };
}

function recommendWatery(current: DialInInput['current']): DialInRecommendation {
  const ratioNote =
    current.ratio && current.ratio >= 16
      ? `Tu ratio actual es 1:${current.ratio} — algo flojo. Busca 1:14 a 1:15.`
      : 'Baja el ratio: usa más café con la misma cantidad de agua, o menos agua con el mismo café.';
  return {
    primaryChange: 'Refuerza el ratio.',
    reason: ratioNote,
    reasonCode: 'STRENGTHEN_RATIO',
    suggestions: [
      'Objetivo tentativo: 1:14 a 1:15 (más cuerpo).',
      'Mantén molienda y tiempo iguales hasta validar el cambio.',
    ],
  };
}

function recommendStrong(_current: DialInInput['current']): DialInRecommendation {
  return {
    primaryChange: 'Sube el ratio.',
    reason: 'Café demasiado fuerte/concentrado — incrementa agua o reduce café.',
    reasonCode: 'WEAKEN_RATIO',
    suggestions: [
      'Objetivo tentativo: 1:16 a 1:17 (más limpio).',
      'Mantén molienda y tiempo iguales hasta validar el cambio.',
    ],
  };
}

function recommendAstringent(current: DialInInput['current']): DialInRecommendation {
  return {
    primaryChange: 'Muele más grueso y suaviza la agitación.',
    reason: 'Astringencia / sequedad indica canales en el lecho o sobreextracción localizada. Menos finos y menos agitación.',
    reasonCode: 'COARSER_LESS_AGITATION',
    suggestions: [
      'Mejora el patrón de vertido para evitar canalización (centro → espirales suaves).',
      reduceAgitation(current),
      'Considera una temperatura 1–2 °C menor.',
    ].filter(Boolean) as string[],
  };
}

// ─── Helpers (return string or null) ───────────────────────────────────

function bumpTemp(current: DialInInput['current']): string | null {
  if (current.temperatureCelsius == null) return 'Sube la temperatura del agua 1–2 °C.';
  if (current.temperatureCelsius >= 96) return null;
  return `Sube la temperatura de ${current.temperatureCelsius} °C a ${current.temperatureCelsius + 1}–${current.temperatureCelsius + 2} °C.`;
}

function dropTemp(current: DialInInput['current']): string | null {
  if (current.temperatureCelsius == null) return 'Baja la temperatura del agua 1–2 °C.';
  if (current.temperatureCelsius <= 86) return null;
  return `Baja la temperatura de ${current.temperatureCelsius} °C a ${current.temperatureCelsius - 1}–${current.temperatureCelsius - 2} °C.`;
}

function bumpContactTime(current: DialInInput['current']): string | null {
  if (current.brewTimeSeconds == null) return 'Incrementa el tiempo total de contacto 10–15 s.';
  return `Incrementa el tiempo total de ${current.brewTimeSeconds}s a ${current.brewTimeSeconds + 10}–${current.brewTimeSeconds + 15}s.`;
}

function dropContactTime(current: DialInInput['current']): string | null {
  if (current.brewTimeSeconds == null) return 'Reduce el tiempo total de contacto 10–15 s.';
  return `Reduce el tiempo total de ${current.brewTimeSeconds}s a ${Math.max(0, current.brewTimeSeconds - 10)}–${current.brewTimeSeconds - 15}s.`;
}

function bumpRatioAgitation(current: DialInInput['current']): string | null {
  if (current.agitation === 'low') return 'Incrementa la agitación suavemente (1–2 swirls).';
  return null;
}

function keepAgitation(current: DialInInput['current']): string | null {
  if (current.agitation === 'high') return 'Reduce la agitación — estás extrayendo demasiado rápido.';
  return null;
}

function reduceAgitation(_current: DialInInput['current']): string | null {
  return 'Reduce la agitación a un swirl suave al final del último vertido.';
}

// ─── Provider interface (for future AI swap) ──────────────────────────

export interface DialInProvider {
  recommend(input: DialInInput): DialInRecommendation;
}

/** Default deterministic provider. */
export const deterministicDialInProvider: DialInProvider = { recommend };

export function getDialInProvider(): DialInProvider {
  // Phase 2: route to AIRecommendationProvider if configured.
  return deterministicDialInProvider;
}
