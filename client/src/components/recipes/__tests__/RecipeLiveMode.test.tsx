import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, beforeEach } from 'vitest';
import RecipeLiveMode from '../RecipeLiveMode';
import type { Recipe } from '../../../types';

// Mock hooks
vi.mock('../../../context/UserContext', () => ({
  useUser: vi.fn((selector: any) => selector({ user: { id: 'u1', name: 'Test' } })),
}));

vi.mock('../../../context/ToastContext', () => ({
  useToast: vi.fn(() => ({ add: vi.fn() })),
}));

vi.mock('../../../hooks/useBarista', () => ({
  useBarista: vi.fn(() => ({
    submitBrewLog: vi.fn().mockResolvedValue({ newAchievements: [] }),
    loading: false,
    error: null,
  })),
}));

// Mock IndexedDB hooks
vi.mock('../../../hooks/useRecipeDraft', () => ({
  saveDraft: vi.fn().mockResolvedValue(undefined),
  loadDraft: vi.fn().mockResolvedValue(null), // no draft by default
  clearDraft: vi.fn().mockResolvedValue(undefined),
}));

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
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders current step full-screen', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    expect(screen.getByText('Paso 1')).toBeInTheDocument();
    expect(screen.getByText('Moler')).toBeInTheDocument();
  });

  it('advances to next step on next button click', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText('Paso 2')).toBeInTheDocument();
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

  it('shows "Registrar Brew" button on last step', () => {
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    fireEvent.click(screen.getByLabelText(/siguiente/i));
    expect(screen.getByText(/registrar/i)).toBeInTheDocument();
  });

  it('shows resume banner when draft exists', async () => {
    const { loadDraft } = await import('../../../hooks/useRecipeDraft');
    vi.mocked(loadDraft).mockResolvedValueOnce({
      id: 'u1:1',
      recipeId: '1',
      userId: 'u1',
      startedAt: '2026-06-11T10:00:00Z',
      currentStepIndex: 1,
      steps: [],
      status: 'in_progress',
    });
    render(<RecipeLiveMode recipe={mockRecipe} onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText(/continuar/i)).toBeInTheDocument());
  });
});
