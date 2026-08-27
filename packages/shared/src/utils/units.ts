/**
 * 12% Brew — units & formatting helpers
 *
 * Single source of truth for brewing unit display.
 * Internally we store grams / °C / seconds; these helpers project them to
 * user-facing strings without scattering logic across components.
 *
 * Future-proof: conversions (oz, °F) live behind the same API so when a
 * locale toggle lands we change one file.
 */

const LOCALE = 'es-MX';

// ─── Grams ──────────────────────────────────────────────────────────────

/** "20 g" or "20.5 g". */
export function formatGrams(grams: number | null | undefined): string {
  if (grams == null || !Number.isFinite(grams)) return '—';
  const rounded = Number.isInteger(grams) ? grams : Math.round(grams * 10) / 10;
  return `${rounded} g`;
}

/** "20" without unit (when adjacent label already says g). */
export function formatGramsShort(grams: number | null | undefined): string {
  if (grams == null || !Number.isFinite(grams)) return '—';
  const rounded = Number.isInteger(grams) ? grams : Math.round(grams * 10) / 10;
  return `${rounded}`;
}

// ─── Temperature ────────────────────────────────────────────────────────

/** "92 °C". */
export function formatCelsius(c: number | null | undefined): string {
  if (c == null || !Number.isFinite(c)) return '—';
  return `${Math.round(c)} °C`;
}

// ─── Time ───────────────────────────────────────────────────────────────

/** Seconds → "MM:SS". */
export function formatSeconds(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

/** Seconds → "01:32". Same as formatSeconds but zero-padded minute. */
export function formatSecondsPadded(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m.toString().padStart(2, '0')}:${r.toString().padStart(2, '0')}`;
}

/** Seconds → "2 min 30 s". */
export function formatSecondsVerbose(totalSeconds: number | null | undefined): string {
  if (totalSeconds == null || !Number.isFinite(totalSeconds) || totalSeconds < 0) return '—';
  const s = Math.floor(totalSeconds);
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `${r} s`;
  if (r === 0) return `${m} min`;
  return `${m} min ${r} s`;
}

// ─── Ratio ──────────────────────────────────────────────────────────────

/** 15 → "1:15", 16.5 → "1:16.5". */
export function formatRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio) || ratio <= 0) return '—';
  // Trim trailing zeros: 15.0 → 15, 16.5 → 16.5
  const trimmed = Number.isInteger(ratio) ? `${ratio}` : `${ratio}`;
  return `1:${trimmed}`;
}

/** "1:15" → 15. Returns null on parse error. */
export function parseRatio(input: string | null | undefined): number | null {
  if (!input) return null;
  const m = input.trim().match(/^1\s*:\s*(\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

// ─── Date ───────────────────────────────────────────────────────────────

/** "26 ago 2026". */
export function formatDateShort(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString(LOCALE, { day: '2-digit', month: 'short', year: 'numeric' });
}

/** "hace 2 horas" / "hace 3 días". Spanish relative time. */
export function formatRelative(d: Date | string | null | undefined): string {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '—';
  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return 'hace unos segundos';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `hace ${diffMin} min`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `hace ${diffHr} h`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 30) return `hace ${diffDay} d`;
  const diffMon = Math.floor(diffDay / 30);
  if (diffMon < 12) return `hace ${diffMon} meses`;
  const diffYr = Math.floor(diffMon / 12);
  return `hace ${diffYr} años`;
}

// ─── Math safety ────────────────────────────────────────────────────────

/** Clamp a number into [min, max]. Returns NaN passthrough so callers can detect it. */
export function clamp(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return n;
  return Math.min(max, Math.max(min, n));
}

/** Round to nearest 0.5 (typical kitchen scale). */
export function roundHalf(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 2) / 2;
}

// ─── Brewing math (shared between server + client) ────────────────────
// Kept here so RatioCalculator (client) and RecipeEngine (server) use the
// same arithmetic. Pure functions, no I/O.

/** Derive water grams from a coffee dose and a water:coffee ratio. */
export function calculateWater(coffeeDoseGrams: number, ratio: number): number {
  if (!Number.isFinite(coffeeDoseGrams) || coffeeDoseGrams <= 0) {
    throw new RangeError('coffeeDoseGrams debe ser > 0');
  }
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError('ratio debe ser > 0');
  }
  return roundHalf(coffeeDoseGrams * ratio);
}

/** Derive coffee grams from a target water amount and ratio. */
export function calculateCoffee(waterGrams: number, ratio: number): number {
  if (!Number.isFinite(waterGrams) || waterGrams <= 0) {
    throw new RangeError('waterGrams debe ser > 0');
  }
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError('ratio debe ser > 0');
  }
  return roundHalf(waterGrams / ratio);
}

/** Compute water:coffee ratio from grams. */
export function ratioFromCoffeeAndWater(coffeeGrams: number, waterGrams: number): number {
  if (coffeeGrams <= 0 || waterGrams <= 0) {
    throw new RangeError('coffeeGrams y waterGrams deben ser > 0');
  }
  return Number((waterGrams / coffeeGrams).toFixed(3));
}
