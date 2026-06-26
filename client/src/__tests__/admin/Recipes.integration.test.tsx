import { vi } from 'vitest';

// ─── Mock api module ─────────────────────────────────────────────────────────
// vi.mock factories are hoisted to the top of the file by Vitest — all data
// referenced inside the factory must be inlined (no external variables).
vi.mock('../../api', () => {
  const seed = {
    id: 'r1',
    title: 'V60 Perfecto',
    slug: 'v60-perfecto',
    description: 'Guía',
    method: 'V60',
    difficulty: 'MEDIA',
    prepTime: 15,
    yield: '250ml',
    temp: '92°C',
    grind: 'Medio',
    ratio: '1:16',
    isPremium: false,
    isPublished: true,
    productId: null,
    product: null,
    steps: [],
    createdAt: '',
    updatedAt: '',
  };
  return {
    recipesApi: {
      adminList: vi.fn().mockResolvedValue({ data: { data: [seed] } }),
      create: vi.fn().mockResolvedValue({
        data: { data: { ...seed, id: 'r2', title: 'Nueva', slug: 'nueva' } },
      }),
      update: vi.fn().mockResolvedValue({ data: { data: seed } }),
      delete: vi.fn().mockResolvedValue({ data: {} }),
      addStep: vi.fn().mockResolvedValue({ data: { data: {} } }),
      updateStep: vi.fn().mockResolvedValue({ data: { data: {} } }),
      deleteStep: vi.fn().mockResolvedValue({ data: {} }),
      reorderSteps: vi.fn().mockResolvedValue({ data: { data: [] } }),
      list: vi.fn().mockResolvedValue({ data: { data: [] } }),
    },
    productsApi: {
      list: vi.fn().mockResolvedValue({ data: { data: [] } }),
      adminList: vi.fn().mockResolvedValue({ data: { data: [], total: 0, page: 1, pageSize: 50, totalPages: 0 } }),
    },
  };
});

// ─── Imports (after vi.mock hoisting) ────────────────────────────────────────
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminRecipes from '../../admin/Recipes';

// useToast is a zustand store — no provider needed; it has no side-effects on mount.

// ─── Tests ───────────────────────────────────────────────────────────────────
describe('AdminRecipes – integration', () => {
  afterEach(() => vi.clearAllMocks());

  it('carga y muestra la lista de recetas', async () => {
    render(<AdminRecipes />);
    // Wait for async load to complete and seed recipe to appear
    await screen.findByText('V60 Perfecto');
    expect(screen.getByText('V60 Perfecto')).toBeInTheDocument();
  });

  it('abre modal de nueva receta al hacer clic en "Nueva receta"', async () => {
    const user = userEvent.setup();
    render(<AdminRecipes />);

    // Wait for list to load so button is interactive
    await screen.findByText('V60 Perfecto');

    const btn = screen.getByRole('button', { name: /nueva receta/i });
    await user.click(btn);

    // Modal opens — title input with placeholder should be present
    expect(screen.getByPlaceholderText('ej. V60 Perfecto')).toBeInTheDocument();
  });

  it('muestra errores de validación al guardar con campos vacíos', async () => {
    const { recipesApi } = await import('../../api');
    const user = userEvent.setup();
    render(<AdminRecipes />);

    await screen.findByText('V60 Perfecto');

    // Open modal
    await user.click(screen.getByRole('button', { name: /nueva receta/i }));

    // Modal should be open
    const titleInput = screen.getByPlaceholderText('ej. V60 Perfecto');
    expect(titleInput).toBeInTheDocument();

    // Click Guardar without filling in required fields
    const saveBtn = screen.getByRole('button', { name: /^guardar$/i });
    await user.click(saveBtn);

    // Validation errors should appear
    await screen.findByText('Título requerido');
    expect(screen.getByText('Título requerido')).toBeInTheDocument();
    expect(screen.getByText('Slug requerido')).toBeInTheDocument();

    // create should NOT have been called
    expect(recipesApi.create).not.toHaveBeenCalled();
  });

  it('filtrar por Borradores oculta recetas publicadas; Todas las muestra de nuevo', async () => {
    const user = userEvent.setup();
    render(<AdminRecipes />);

    // Seed recipe is published — should appear under "Todas"
    await screen.findByText('V60 Perfecto');

    // Click "Borradores" filter
    const borradorBtn = screen.getByRole('button', { name: /borradores/i });
    await user.click(borradorBtn);

    // Published recipe should be gone; empty-state message should appear
    await waitFor(() => {
      expect(screen.queryByText('V60 Perfecto')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Sin recetas. Crea la primera.')).toBeInTheDocument();

    // Click "Todas" to restore
    const todasBtn = screen.getByRole('button', { name: /^todas$/i });
    await user.click(todasBtn);

    await screen.findByText('V60 Perfecto');
    expect(screen.getByText('V60 Perfecto')).toBeInTheDocument();
  });
});
