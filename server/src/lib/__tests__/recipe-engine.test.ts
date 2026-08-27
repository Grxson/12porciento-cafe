/// <reference types="vitest/globals" />
import { describe, it, expect } from 'vitest';

import {
  calculateCoffee,
  calculateWater,
  ratioFromCoffeeAndWater,
  roundStepWater,
  scaleRecipe,
  scaleSteps,
  validateRecipeConsistency,
  type BrewRecipe,
  type BrewStep,
} from '../recipe-engine';

const baseRecipe: BrewRecipe = {
  coffeeDoseGrams: 20,
  waterGrams: 300,
  ratio: 15,
  waterTemperatureCelsius: 92,
  grindTargetMicrons: 700,
  steps: [
    {
      order: 1,
      type: 'PREPARE',
      title: 'Prepara el equipo',
      duration: 30,
    },
    {
      order: 2,
      type: 'ADD_COFFEE',
      title: 'Agrega café',
      duration: 10,
    },
    {
      order: 3,
      type: 'BLOOM',
      title: 'Bloom',
      waterAmountGrams: 50,
      targetTotalWaterGrams: 50,
      duration: 45,
    },
    {
      order: 4,
      type: 'POUR',
      title: 'Vertido 2',
      waterAmountGrams: 70,
      targetTotalWaterGrams: 120,
      duration: 20,
    },
    {
      order: 5,
      type: 'POUR',
      title: 'Vertido 3',
      waterAmountGrams: 60,
      targetTotalWaterGrams: 180,
      duration: 20,
    },
    {
      order: 6,
      type: 'POUR',
      title: 'Vertido 4',
      waterAmountGrams: 60,
      targetTotalWaterGrams: 240,
      duration: 20,
    },
    {
      order: 7,
      type: 'POUR',
      title: 'Vertido 5',
      waterAmountGrams: 60,
      targetTotalWaterGrams: 300,
      duration: 20,
    },
    {
      order: 8,
      type: 'SERVE',
      title: 'Sirve',
      duration: 5,
    },
  ],
};

describe('calculateWater', () => {
  it('20g × 1:15 → 300g', () => {
    expect(calculateWater(20, 15)).toBe(300);
  });
  it('17g × 1:15 → 255g', () => {
    expect(calculateWater(17, 15)).toBe(255);
  });
  it('throws on non-positive inputs', () => {
    expect(() => calculateWater(0, 15)).toThrow();
    expect(() => calculateWater(20, 0)).toThrow();
    expect(() => calculateWater(NaN, 15)).toThrow();
  });
});

describe('calculateCoffee', () => {
  it('300g ÷ 15 → 20g', () => {
    expect(calculateCoffee(300, 15)).toBe(20);
  });
  it('255g ÷ 15 → 17g', () => {
    expect(calculateCoffee(255, 15)).toBe(17);
  });
});

describe('ratioFromCoffeeAndWater', () => {
  it('300g / 20g → 15', () => {
    expect(ratioFromCoffeeAndWater(20, 300)).toBe(15);
  });
  it('respects precision', () => {
    expect(ratioFromCoffeeAndWater(18, 288)).toBe(16);
  });
});

describe('roundStepWater', () => {
  it('rounds to 0.5g by default', () => {
    expect(roundStepWater(42.3)).toBe(42.5);
    expect(roundStepWater(42.1)).toBe(42);
    expect(roundStepWater(42.75)).toBe(43);
  });
  it('accepts custom precision', () => {
    expect(roundStepWater(42.37, 0.1)).toBeCloseTo(42.4, 5);
    expect(roundStepWater(42.37, 1)).toBe(42);
  });
});

describe('scaleRecipe (canonical case from spec)', () => {
  it('20g→17g with original 50/70/60/60/60 sums to 255', () => {
    const scaled = scaleRecipe(baseRecipe, 17);
    expect(scaled.coffeeDoseGrams).toBe(17);
    expect(scaled.waterGrams).toBe(255);
    expect(scaled.ratio).toBe(15);
    expect(scaled.scale).toBeCloseTo(0.85, 5);

    const waterSteps = scaled.steps.filter(
      (s) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0,
    );
    const sum = waterSteps.reduce((acc, s) => acc + (s.waterAmountGrams ?? 0), 0);
    expect(sum).toBeCloseTo(255, 5);

    // Each per-step amount is within 5% of the proportionally ideal value.
    const ideal = [50, 70, 60, 60, 60].map((x) => x * 0.85);
    waterSteps.forEach((s, i) => {
      expect(s.waterAmountGrams).toBeGreaterThan(ideal[i] * 0.95);
      expect(s.waterAmountGrams).toBeLessThan(ideal[i] * 1.05);
    });
  });

  it('20g→30g scales up cleanly', () => {
    const scaled = scaleRecipe(baseRecipe, 30);
    expect(scaled.waterGrams).toBe(450);
    const waterSteps = scaled.steps.filter(
      (s) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0,
    );
    const sum = waterSteps.reduce((acc, s) => acc + (s.waterAmountGrams ?? 0), 0);
    expect(sum).toBeCloseTo(450, 5);
  });

  it('preserves non-water step fields (type, duration, title)', () => {
    const scaled = scaleRecipe(baseRecipe, 25);
    const prepareStep = scaled.steps.find((s) => s.type === 'PREPARE');
    expect(prepareStep).toBeDefined();
    expect(prepareStep?.title).toBe('Prepara el equipo');
    expect(prepareStep?.duration).toBe(30);
  });

  it('recomputes cumulative targetTotalWaterGrams after scaling', () => {
    const scaled = scaleRecipe(baseRecipe, 17);
    const waterSteps = scaled.steps.filter(
      (s) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0,
    );
    let running = 0;
    waterSteps.forEach((s) => {
      running += s.waterAmountGrams ?? 0;
      expect(s.targetTotalWaterGrams).toBeCloseTo(running, 5);
    });
  });

  it('throws on non-positive coffee dose', () => {
    expect(() => scaleRecipe(baseRecipe, 0)).toThrow();
    expect(() => scaleRecipe(baseRecipe, -5)).toThrow();
  });
});

describe('scaleSteps edge cases', () => {
  it('handles single water step', () => {
    const steps: BrewStep[] = [{ order: 1, waterAmountGrams: 100 }];
    const out = scaleSteps(steps, 0.5, 50);
    expect(out[0].waterAmountGrams).toBe(50);
  });

  it('returns passthrough when no water steps', () => {
    const steps: BrewStep[] = [
      { order: 1, type: 'PREPARE' },
      { order: 2, type: 'SERVE' },
    ];
    const out = scaleSteps(steps, 0.5, 100);
    expect(out).toHaveLength(2);
    expect(out[0].waterAmountGrams).toBeUndefined();
  });

  it('last step absorbs rounding delta (no floating drift)', () => {
    // Recipe with intentionally awkward numbers
    const steps: BrewStep[] = [
      { order: 1, waterAmountGrams: 33 },
      { order: 2, waterAmountGrams: 33 },
      { order: 3, waterAmountGrams: 33 },
    ];
    const target = 67; // not a clean fraction of 33
    const out = scaleSteps(steps, 1, target);
    const sum = out.reduce((acc, s) => acc + (s.waterAmountGrams ?? 0), 0);
    expect(sum).toBeCloseTo(target, 1);
  });
});

describe('validateRecipeConsistency', () => {
  it('passes the canonical 12% Sweet V60 recipe', () => {
    const errors = validateRecipeConsistency(baseRecipe);
    expect(errors).toEqual([]);
  });

  it('flags invalid coffee dose', () => {
    const bad = { ...baseRecipe, coffeeDoseGrams: 0 };
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'INVALID_COFFEE_DOSE')).toBe(true);
  });

  it('flags ratio mismatch with water/coffee', () => {
    const bad: BrewRecipe = { ...baseRecipe, ratio: 20 }; // waterGrams/coffeeDoseGrams = 15
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'RATIO_MISMATCH')).toBe(true);
  });

  it('flags water sum mismatch', () => {
    const bad: BrewRecipe = {
      ...baseRecipe,
      steps: baseRecipe.steps.map((s) =>
        s.waterAmountGrams ? { ...s, waterAmountGrams: s.waterAmountGrams + 5 } : s,
      ),
    };
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'WATER_SUM_MISMATCH')).toBe(true);
  });

  it('flags out-of-range temperature', () => {
    const bad: BrewRecipe = { ...baseRecipe, waterTemperatureCelsius: 110 };
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'INVALID_TEMP')).toBe(true);
  });

  it('flags duplicate step orders', () => {
    const bad: BrewRecipe = {
      ...baseRecipe,
      steps: [
        { order: 1, waterAmountGrams: 100 },
        { order: 1, waterAmountGrams: 100 },
      ],
    };
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'DUPLICATE_ORDER')).toBe(true);
  });

  it('flags empty steps', () => {
    const bad: BrewRecipe = { ...baseRecipe, steps: [] };
    const errors = validateRecipeConsistency(bad);
    expect(errors.some((e) => e.code === 'NO_STEPS')).toBe(true);
  });
});
