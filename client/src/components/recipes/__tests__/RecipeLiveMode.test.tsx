import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import RecipeLiveMode from '../RecipeLiveMode';
import type { Recipe } from '../../../types';

const mockRecipe: Recipe = {
  id: '1',
  title: 'Espresso Perfecto',
  slug: 'espresso-perfecto',
  method: 'Espresso',
  difficulty: 'MEDIA',
  isPremium: false,
  isPublished: true,
  description: 'Test',
  steps: [
    { id: 's1', recipeId: '1', title: 'Paso 1', description: 'Moler', order: 1, duration: 30 },
    { id: 's2', recipeId: '1', title: 'Paso 2', description: 'Extraer', order: 2, duration: 25 },
  ],
  product: null,
  temp: '90°C',
  grind: 'Medio',
  ratio: '1:2',
  yield: '30ml',
  prepTime: 5,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

describe('RecipeLiveMode', () => {
  it('renders current step full-screen', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Moler')).toBeInTheDocument();
  });

  it('advances to next step on next button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
    expect(screen.getByText('Extraer')).toBeInTheDocument();
  });

  it('goes back to previous step on prev button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    fireEvent.click(screen.getByLabelText(/anterior/i));
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<RecipeLiveMode recipe={mockRecipe} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/cerrar/i));
    expect(onClose).toHaveBeenCalled();
  });
});
