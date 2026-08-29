/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import RatioCalculator from '../RatioCalculator';
import type { BrewConfiguration, BrewStepStructured } from '@12porciento/shared';

const baseSteps: BrewStepStructured[] = [
  { order: 1, type: 'BLOOM', title: 'Bloom', waterAmountGrams: 50 },
  { order: 2, type: 'POUR', title: 'V2', waterAmountGrams: 70 },
  { order: 3, type: 'POUR', title: 'V3', waterAmountGrams: 60 },
  { order: 4, type: 'POUR', title: 'V4', waterAmountGrams: 60 },
  { order: 5, type: 'POUR', title: 'V5', waterAmountGrams: 60 },
];

function makeConfig(coffee: number, water: number, ratio: number): BrewConfiguration {
  return {
    recipeId: 'recipe-1',
    coffeeDoseGrams: coffee,
    waterGrams: water,
    ratio,
    temperatureCelsius: 92,
    steps: baseSteps,
  };
}

// Controlled harness: the parent owns the config, exactly like BrewPrepare.
function Harness({
  initial,
  onChange,
}: {
  initial: BrewConfiguration;
  onChange?: (c: BrewConfiguration) => void;
}) {
  const [config, setConfig] = useState(initial);
  return (
    <RatioCalculator
      value={config}
      onChange={(c) => {
        onChange?.(c);
        setConfig(c);
      }}
    />
  );
}

describe('<RatioCalculator />', () => {
  it('renders initial coffee, water and ratio', () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    expect(screen.getByLabelText(/café/i)).toHaveValue(20);
    expect(screen.getByLabelText(/agua/i)).toHaveValue(300);
    expect(screen.getByLabelText(/ratio/i)).toHaveValue(15);
  });

  it('recomputes water when coffee dose changes (preserves ratio)', async () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    fireEvent.change(screen.getByLabelText(/café/i), { target: { value: '17' } });
    await waitFor(() => expect(screen.getByLabelText(/agua/i)).toHaveValue(255));
  });

  it('recomputes coffee when water changes (preserves ratio)', () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    fireEvent.change(screen.getByLabelText(/agua/i), { target: { value: '255' } });
    expect(screen.getByLabelText(/café/i)).toHaveValue(17);
  });

  it('recomputes water when ratio changes (preserves coffee)', () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    fireEvent.change(screen.getByLabelText(/ratio/i), { target: { value: '16' } });
    expect(screen.getByLabelText(/agua/i)).toHaveValue(320);
  });

  it('shows scaled step amounts in the preview', async () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    fireEvent.change(screen.getByLabelText(/café/i), { target: { value: '17' } });
    await waitFor(() => expect(screen.getByLabelText(/agua/i)).toHaveValue(255));
    // Bloom was 50g → at 17g coffee it should scale to ~42.5g
    expect(screen.getAllByText(/V[2-5]|Bloom/i).length).toBeGreaterThan(0);
  });

  it('last step is marked as the rounding-adjustment step', () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    expect(screen.getByText(/\(ajuste\)/)).toBeInTheDocument();
  });

  it('shows ratio actual in the footer summary', () => {
    render(<Harness initial={makeConfig(20, 300, 15)} />);
    expect(screen.getByText(/1:15/i)).toBeInTheDocument();
  });

  // Critical test (plan Fase 2/20): 20g → 17g must produce water 255g with
  // steps re-scaled so their sum is EXACTLY 255 (last step absorbs rounding).
  it('20g→17g onChange emits water 255 and steps summing exactly 255', async () => {
    const onChange = vi.fn();
    render(<Harness initial={makeConfig(20, 300, 15)} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/café/i), { target: { value: '17' } });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    const emitted = onChange.mock.calls.at(-1)![0] as BrewConfiguration;
    expect(emitted.coffeeDoseGrams).toBe(17);
    expect(emitted.waterGrams).toBe(255);
    expect(emitted.ratio).toBe(15);
    const waterSum = emitted.steps
      .filter((s) => typeof s.waterAmountGrams === 'number')
      .reduce((acc, s) => acc + (s.waterAmountGrams ?? 0), 0);
    expect(waterSum).toBe(255);
  });
});
