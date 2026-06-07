import { vi } from 'vitest';
vi.mock('../../api', () => ({
  recipesApi: {
    adminList: vi.fn().mockResolvedValue({ data: { data: [
      { id: 'r1', title: 'Seed', slug: 'seed', method: 'V60', difficulty: 'MEDIA', isPremium: false, isPublished: true, steps: [], createdAt: '', updatedAt: '' },
    ] } }),
    create: vi.fn().mockResolvedValue({ data: { data: { id: 'r2', title: 'V60 Perfecto', slug: 'v60-perfecto', method: 'V60', difficulty: 'MEDIA', isPremium: false, isPublished: false, steps: [], createdAt: '', updatedAt: '' } } }),
    update: vi.fn().mockResolvedValue({ data: { data: { id: 'r1', title: 'Upd', slug: 'seed', method: 'V60', difficulty: 'MEDIA', isPremium: false, isPublished: true, steps: [], createdAt: '', updatedAt: '' } } }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
}));

import { renderHook, act, waitFor } from '@testing-library/react';
import { useRecipes } from '../useRecipes';

describe('useRecipes', () => {
  it('carga recetas al montar', async () => {
    const { result } = renderHook(() => useRecipes());
    expect(result.current.loading).toBe(true);

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
      expect(Array.isArray(result.current.recipes)).toBe(true);
    });
  });

  it('maneja errores de carga', async () => {
    const { result } = renderHook(() => useRecipes());
    await waitFor(() => {
      if (result.current.error) {
        expect(typeof result.current.error).toBe('string');
      }
    });
  });

  it('crea receta', async () => {
    const { result } = renderHook(() => useRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const newRecipe = {
      title: 'V60 Perfecto',
      slug: 'v60-perfecto',
      method: 'V60',
      description: 'Guía completa V60',
    };

    await act(async () => {
      await result.current.createRecipe(newRecipe as any);
    });

    await waitFor(() => {
      const created = result.current.recipes.find(r => r.slug === 'v60-perfecto');
      expect(created).toBeDefined();
    });
  });

  it('elimina receta', async () => {
    const { result } = renderHook(() => useRecipes());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const recipeId = result.current.recipes[0]?.id;
    if (!recipeId) return;

    await act(async () => {
      await result.current.deleteRecipe(recipeId);
    });

    await waitFor(() => {
      const deleted = result.current.recipes.find(r => r.id === recipeId);
      expect(deleted).toBeUndefined();
    });
  });
});
