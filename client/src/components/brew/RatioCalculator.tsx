/**
 * 12% Brew — RatioCalculator
 *
 * Lets the user rebase a recipe on a new coffee dose or water amount.
 * Updates ratio/water/coffee in real time using the same arithmetic the
 * RecipeEngine uses server-side (calculateCoffee/calculateWater).
 *
 * Visualizes the effect on each water-bearing step in the recipe (preview).
 */

import { useMemo, useState } from 'react';
import { Scale, Droplets, Divide } from 'lucide-react';
import {
  calculateCoffee,
  calculateWater,
  ratioFromCoffeeAndWater,
  roundHalf,
  formatGrams,
  formatRatio,
} from '@12porciento/shared';
import type { BrewStepStructured, ScaledRecipe } from '@12porciento/shared';

interface RatioCalculatorProps {
  initialCoffee: number;
  initialWater: number;
  ratio: number;
  steps?: BrewStepStructured[];
  /** Remote scaling source (RecipeEngine server-side). When provided, dose
   *  changes are scaled by the server and its step amounts win over the
   *  local preview. Falls back to local arithmetic when absent or failing. */
  remoteScale?: (coffeeGrams: number) => Promise<ScaledRecipe>;
}

export default function RatioCalculator({
  initialCoffee,
  initialWater,
  ratio: initialRatio,
  steps = [],
  remoteScale,
}: RatioCalculatorProps) {
  const [coffee, setCoffee] = useState(roundHalf(initialCoffee));
  const [water, setWater] = useState(roundHalf(initialWater));
  const [scaledSteps, setScaledSteps] = useState<BrewStepStructured[]>(steps);

  const ratio = useMemo(
    () => ratioFromCoffeeAndWater(coffee, water) || initialRatio,
    [coffee, water, initialRatio],
  );

  // Preview of scaled water amounts per step (does not mutate the recipe).
  // Server-scaled steps win when available (RecipeEngine is single source).
  const stepPreview = useMemo(() => {
    const target = scaledSteps.length > 0 ? scaledSteps : steps;
    if (target.length === 0) return [];
    const waterSteps = target.filter(
      (s) => typeof s.waterAmountGrams === 'number' && (s.waterAmountGrams ?? 0) > 0,
    );
    return waterSteps.map((s, idx) => {
      const isLast = idx === waterSteps.length - 1;
      return { order: s.order, title: s.title, grams: roundHalf(s.waterAmountGrams ?? 0), isLast };
    });
  }, [scaledSteps, steps]);

  async function onChangeCoffee(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    const newCoffee = roundHalf(n);
    setCoffee(newCoffee);
    setWater(calculateWater(newCoffee, ratio));
    if (!remoteScale) return;
    try {
      const scaled = await remoteScale(newCoffee);
      setScaledSteps(scaled.steps);
      setWater(roundHalf(scaled.waterGrams));
    } catch {
      // Keep local preview; server scale failed (offline or validation).
    }
  }

  function onChangeWater(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    const newWater = roundHalf(n);
    setWater(newWater);
    setCoffee(calculateCoffee(newWater, ratio));
  }

  function onChangeRatio(n: number) {
    if (!Number.isFinite(n) || n <= 0) return;
    setWater(calculateWater(coffee, n));
  }

  return (
    <section className="border border-coffee-200 bg-white p-5 dark:border-coffee-800 dark:bg-coffee-900">
      <header className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-gold-500/10 text-gold-600 dark:text-gold-400">
          <Divide className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-serif text-lg text-coffee-900 dark:text-cream">Calculadora</h3>
          <p className="text-xs text-coffee-500">Ajusta dosis, agua o ratio.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <InputField
          icon={<Droplets className="h-4 w-4" />}
          label="Café"
          suffix="g"
          value={coffee}
          onChange={onChangeCoffee}
          min={1}
          step={0.5}
        />
        <InputField
          icon={<Scale className="h-4 w-4" />}
          label="Agua"
          suffix="g"
          value={water}
          onChange={onChangeWater}
          min={1}
          step={5}
        />
        <InputField
          icon={<Divide className="h-4 w-4" />}
          label="Ratio"
          prefix="1:"
          value={ratio}
          onChange={onChangeRatio}
          min={1}
          step={0.5}
        />
      </div>

      {stepPreview.length > 0 && (
        <div className="mt-5 border-t border-coffee-200 pt-4 dark:border-coffee-800">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
            Vertidos (proyección)
          </p>
          <ol className="space-y-1.5">
            {stepPreview.map((s) => (
              <li
                key={s.order}
                className="flex items-center justify-between text-sm text-coffee-700 dark:text-coffee-300"
              >
                <span className="flex items-center gap-2">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-coffee-100 text-[10px] font-bold text-coffee-600 dark:bg-coffee-800 dark:text-coffee-300">
                    {s.order}
                  </span>
                  {s.title ?? `Paso ${s.order}`}
                </span>
                <span className="font-mono font-semibold text-coffee-900 dark:text-cream">
                  {formatGrams(s.grams)}
                  {s.isLast && (
                    <span className="ml-1 text-[10px] text-gold-600 dark:text-gold-400">
                      (ajuste)
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <p className="mt-4 text-[11px] text-coffee-500">
        Ratio actual: <span className="font-semibold">{formatRatio(ratio)}</span>. El último vertido
        absorbe el redondeo.
      </p>
    </section>
  );
}

function InputField({
  icon,
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  step,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  onChange: (n: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-coffee-500">
        {icon} {label}
      </span>
      <div className="mt-1 flex items-center overflow-hidden rounded border border-coffee-200 bg-coffee-50 focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500 dark:border-coffee-700 dark:bg-coffee-950">
        {prefix && <span className="px-2 text-xs text-coffee-500">{prefix}</span>}
        <input
          type="number"
          inputMode="decimal"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="min-w-0 flex-1 bg-transparent py-2 pr-2 text-base font-semibold text-coffee-900 outline-none dark:text-cream"
        />
        {suffix && <span className="px-2 text-xs text-coffee-500">{suffix}</span>}
      </div>
    </label>
  );
}
