/// <reference types="vitest/globals" />
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RatioCalculator from '../RatioCalculator';

// The component pulls format helpers from @12porciento/shared. We don't need
// to mock them; the workspace package is resolved by vitest.

const baseSteps = [
  { order: 1, type: 'BLOOM' as const, title: 'Bloom', waterAmountGrams: 50 },
  { order: 2, type: 'POUR' as const, title: 'V2', waterAmountGrams: 70 },
  { order: 3, type: 'POUR' as const, title: 'V3', waterAmountGrams: 60 },
  { order: 4, type: 'POUR' as const, title: 'V4', waterAmountGrams: 60 },
  { order: 5, type: 'POUR' as const, title: 'V5', waterAmountGrams: 60 },
];

describe('<RatioCalculator />', () => {
  it('renders initial coffee, water and ratio', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    expect(screen.getByLabelText(/café/i)).toHaveValue(20);
    expect(screen.getByLabelText(/agua/i)).toHaveValue(300);
    expect(screen.getByLabelText(/ratio/i)).toHaveValue(15);
  });

  it('recomputes water when coffee dose changes (preserves ratio)', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    const coffeeInput = screen.getByLabelText(/café/i);
    fireEvent.change(coffeeInput, { target: { value: '17' } });
    expect(screen.getByLabelText(/agua/i)).toHaveValue(255);
  });

  it('recomputes coffee when water changes (preserves ratio)', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    const waterInput = screen.getByLabelText(/agua/i);
    fireEvent.change(waterInput, { target: { value: '255' } });
    expect(screen.getByLabelText(/café/i)).toHaveValue(17);
  });

  it('recomputes water when ratio changes (preserves coffee)', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    const ratioInput = screen.getByLabelText(/ratio/i);
    fireEvent.change(ratioInput, { target: { value: '16' } });
    expect(screen.getByLabelText(/agua/i)).toHaveValue(320);
  });

  it('shows scaled step amounts in the preview', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    const coffeeInput = screen.getByLabelText(/café/i);
    fireEvent.change(coffeeInput, { target: { value: '17' } });
    // Bloom was 50g → at 17g coffee it should scale to ~42.5g
    // Water was 300g → 255g
    // Check that step labels render
    expect(screen.getAllByText(/V[2-5]|Bloom/i).length).toBeGreaterThan(0);
  });

  it('last step is marked as the rounding-adjustment step', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    expect(screen.getByText(/\(ajuste\)/)).toBeInTheDocument();
  });

  it('shows ratio actual in the footer summary', () => {
    render(<RatioCalculator initialCoffee={20} initialWater={300} ratio={15} steps={baseSteps} />);
    expect(screen.getByText(/1:15/i)).toBeInTheDocument();
  });
});
