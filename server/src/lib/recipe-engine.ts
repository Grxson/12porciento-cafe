/**
 * 12% Brew — RecipeEngine
 *
 * Pure functions for scaling, validating and projecting brew recipes.
 *
 * No DB / no IO. All units are grams, °C and seconds. Deterministic.
 *
 * Algorithms:
 *  - scaleRecipe: re-bases water/ratio/step amounts on a new coffee dose while
 *    preserving per-step proportions. The last water-bearing step absorbs
 *    the rounding delta so `sum(stepWater) === totalWater` (within tolerance).
 *  - validateRecipeConsistency: structural checks before a recipe can be
 *    published.
 */

export type BrewStepType =
  | 'PREPARE'
  | 'RINSE'
  | 'ADD_COFFEE'
  | 'BLOOM'
  | 'POUR'
  | 'WAIT'
  | 'STIR'
  | 'SWIRL'
  | 'PRESS'
  | 'REMOVE_HEAT'
  | 'COOL'
  | 'SERVE'
  | 'CUSTOM';

export type BrewStepAction =
  | 'ADD'
  | 'POUR'
  | 'WAIT'
  | 'STIR'
  | 'SWIRL'
  | 'TAP'
  | 'PRESS'
  | 'BREATHE'
  | 'CUSTOM';

export type PourPattern =
  | 'CENTER'
  | 'CIRCULAR'
  | 'SPIRAL_OUT'
  | 'SPIRAL_IN'
  | 'CENTER_TO_OUT'
  | 'OUT_TO_CENTER'
  | 'PULSE'
  | 'CUSTOM';

/** Minimum representation of a structured brew step. */
export interface BrewStep {
  order: number;
  title?: string;
  description?: string;
  type?: BrewStepType | string;
  duration?: number | null;
  startTimeSeconds?: number | null;
  /** Amount of water poured IN THIS STEP (grams). */
  waterAmountGrams?: number | null;
  /** Cumulative target by the end of this step (grams). */
  targetTotalWaterGrams?: number | null;
  action?: BrewStepAction | string | null;
  pourPattern?: PourPattern | string | null;
  flowRateGramsPerSecond?: number | null;
  temperatureCelsius?: number | null;
  instruction?: string | null;
  optional?: boolean;
}

/** Minimum representation of a structured brew recipe. */
export interface BrewRecipe {
  coffeeDoseGrams: number;
  waterGrams: number;
  /** water:coffee ratio (e.g. 15.0 for 1:15). */
  ratio: number;
  waterTemperatureCelsius?: number | null;
  grindTargetMicrons?: number | null;
  steps: BrewStep[];
}

export interface ScaledRecipe extends BrewRecipe {
  /** What we used to scale. coffeeDoseGrams / originalCoffeeDoseGrams. */
  scale: number;
}

export interface ConsistencyError {
  code: string;
  message: string;
}

const EPSILON = 0.05; // grams — float-rounding tolerance for water sums

// ─── Pure math ──────────────────────────────────────────────────────────

/** Derive water grams from a coffee dose and a water:coffee ratio. */
export function calculateWater(coffeeDoseGrams: number, ratio: number): number {
  if (!Number.isFinite(coffeeDoseGrams) || coffeeDoseGrams <= 0) {
    throw new RangeError('coffeeDoseGrams debe ser > 0');
  }
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError('ratio debe ser > 0');
  }
  return roundStepWater(coffeeDoseGrams * ratio);
}

/** Derive coffee grams from a target water amount and ratio. */
export function calculateCoffee(waterGrams: number, ratio: number): number {
  if (!Number.isFinite(waterGrams) || waterGrams <= 0) {
    throw new RangeError('waterGrams debe ser > 0');
  }
  if (!Number.isFinite(ratio) || ratio <= 0) {
    throw new RangeError('ratio debe ser > 0');
  }
  return roundStepWater(waterGrams / ratio);
}

/** Compute ratio from coffee + water. */
export function ratioFromCoffeeAndWater(coffeeGrams: number, waterGrams: number): number {
  if (coffeeGrams <= 0 || waterGrams <= 0) {
    throw new RangeError('coffeeGrams y waterGrams deben ser > 0');
  }
  return Number((waterGrams / coffeeGrams).toFixed(3));
}

/**
 * Round a water amount to a sensible precision for brewing.
 * Default 0.5g — most kitchen scales have 1g resolution; 0.5g keeps the
 * pour count low while preserving visual continuity.
 */
export function roundStepWater(amount: number, precision = 0.5): number {
  if (!Number.isFinite(amount)) return 0;
  return Math.round(amount / precision) * precision;
}

// ─── Scaling ────────────────────────────────────────────────────────────

/**
 * Project a recipe onto a new coffee dose while preserving step proportions.
 *
 * Strategy:
 *  1. compute scale = newCoffeeDose / originalCoffeeDose
 *  2. ratio stays the same (user-controlled); water target = newCoffee * ratio
 *  3. for each step:
 *      - if it carries a waterAmountGrams > 0, scale proportionally
 *      - other steps (WAIT, STIR, SERVE, etc.) keep their non-water fields
 *  4. the last water-bearing step absorbs the rounding delta so
 *      `sum(scaledWaterAmountGrams) === targetWater` exactly.
 */
export function scaleRecipe(original: BrewRecipe, newCoffeeDoseGrams: number): ScaledRecipe {
  if (!Number.isFinite(newCoffeeDoseGrams) || newCoffeeDoseGrams <= 0) {
    throw new RangeError('newCoffeeDoseGrams debe ser > 0');
  }
  if (!Number.isFinite(original.coffeeDoseGrams) || original.coffeeDoseGrams <= 0) {
    throw new RangeError('original.coffeeDoseGrams debe ser > 0');
  }

  const scale = newCoffeeDoseGrams / original.coffeeDoseGrams;
  const targetWater = calculateWater(newCoffeeDoseGrams, original.ratio);

  const scaledSteps = scaleSteps(original.steps ?? [], scale, targetWater);

  return {
    coffeeDoseGrams: roundStepWater(newCoffeeDoseGrams),
    waterGrams: targetWater,
    ratio: original.ratio,
    waterTemperatureCelsius: original.waterTemperatureCelsius ?? null,
    grindTargetMicrons: original.grindTargetMicrons ?? null,
    steps: scaledSteps,
    scale,
  };
}

/**
 * Apply scale to a list of steps; last water-bearing step absorbs rounding delta.
 */
export function scaleSteps(steps: BrewStep[], scale: number, totalWater: number): BrewStep[] {
  if (!Array.isArray(steps) || steps.length === 0) return [];
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError('scale debe ser > 0');
  }
  if (!Number.isFinite(totalWater) || totalWater <= 0) {
    throw new RangeError('totalWater debe ser > 0');
  }

  // Identify indices of water-bearing steps (preserve original order).
  const waterIndices = steps
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0)
    .map(({ i }) => i);

  if (waterIndices.length === 0) {
    // No water steps — just project non-water fields and return as-is.
    return steps.map((s) => ({ ...s }));
  }

  // Round each proportional step (except the last water step which absorbs delta).
  const lastWaterIdx = waterIndices[waterIndices.length - 1];
  const rounded: BrewStep[] = steps.map((s, i) => {
    if (typeof s.waterAmountGrams !== 'number') return { ...s };
    if (i === lastWaterIdx) {
      // Filled in below.
      return { ...s };
    }
    const projected = roundStepWater((s.waterAmountGrams ?? 0) * scale);
    return { ...s, waterAmountGrams: projected };
  });

  // Compute running sum of already-rounded water steps (excluding the last).
  let sumRounded = 0;
  for (const idx of waterIndices) {
    if (idx === lastWaterIdx) continue;
    sumRounded += rounded[idx].waterAmountGrams ?? 0;
  }

  const lastRounded = roundStepWater(totalWater - sumRounded);
  rounded[lastWaterIdx] = {
    ...rounded[lastWaterIdx],
    waterAmountGrams: lastRounded,
  };

  // Recompute cumulative targetTotalWaterGrams from scratch (if any step
  // carried a cumulative value) so it stays consistent with the scaled pours.
  let running = 0;
  for (let i = 0; i < rounded.length; i++) {
    if (typeof rounded[i].waterAmountGrams === 'number') {
      running += rounded[i].waterAmountGrams ?? 0;
      rounded[i].targetTotalWaterGrams = running;
    }
  }

  return rounded;
}

// ─── Validation ─────────────────────────────────────────────────────────

/**
 * Run structural / consistency checks on a structured recipe.
 * Returns an empty array when valid.
 */
export function validateRecipeConsistency(recipe: BrewRecipe): ConsistencyError[] {
  const errors: ConsistencyError[] = [];

  if (!Number.isFinite(recipe.coffeeDoseGrams) || recipe.coffeeDoseGrams <= 0) {
    errors.push({ code: 'INVALID_COFFEE_DOSE', message: 'coffeeDoseGrams debe ser > 0' });
  }
  if (!Number.isFinite(recipe.waterGrams) || recipe.waterGrams <= 0) {
    errors.push({ code: 'INVALID_WATER', message: 'waterGrams debe ser > 0' });
  }
  if (!Number.isFinite(recipe.ratio) || recipe.ratio <= 0) {
    errors.push({ code: 'INVALID_RATIO', message: 'ratio debe ser > 0' });
  }

  if (recipe.coffeeDoseGrams > 0 && recipe.waterGrams > 0) {
    const expectedRatio = recipe.waterGrams / recipe.coffeeDoseGrams;
    if (Math.abs(expectedRatio - recipe.ratio) > 0.5) {
      errors.push({
        code: 'RATIO_MISMATCH',
        message: `ratio (${recipe.ratio}) no concuerda con waterGrams/coffeeDoseGrams (${expectedRatio.toFixed(2)})`,
      });
    }
  }

  if (recipe.waterTemperatureCelsius != null) {
    const t = recipe.waterTemperatureCelsius;
    if (t < 60 || t > 100) {
      errors.push({ code: 'INVALID_TEMP', message: 'temperatura fuera de rango 60–100 °C' });
    }
  }

  if (!Array.isArray(recipe.steps) || recipe.steps.length === 0) {
    errors.push({ code: 'NO_STEPS', message: 'la receta debe tener al menos un paso' });
  } else {
    const orders = new Set<number>();
    for (const step of recipe.steps) {
      if (!orders.has(step.order)) orders.add(step.order);
      else errors.push({ code: 'DUPLICATE_ORDER', message: `step.order duplicado: ${step.order}` });

      if (step.duration != null && step.duration < 0) {
        errors.push({ code: 'NEGATIVE_DURATION', message: `duration < 0 en paso ${step.order}` });
      }
      if (step.waterAmountGrams != null && step.waterAmountGrams < 0) {
        errors.push({
          code: 'NEGATIVE_WATER',
          message: `waterAmountGrams < 0 en paso ${step.order}`,
        });
      }
    }

    // Sum of step waters vs total water — only check if at least one step
    // carries a water amount.
    const waterSteps = recipe.steps.filter(
      (s) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0,
    );
    if (waterSteps.length > 0) {
      const sum = waterSteps.reduce((acc, s) => acc + (s.waterAmountGrams ?? 0), 0);
      if (Math.abs(sum - recipe.waterGrams) > EPSILON) {
        errors.push({
          code: 'WATER_SUM_MISMATCH',
          message: `sum(stepWater) = ${sum.toFixed(2)} ≠ waterGrams = ${recipe.waterGrams}`,
        });
      }
    }
  }

  return errors;
}
