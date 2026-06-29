import { useState, useCallback, useEffect } from 'react';
import { recipesApi } from '../api';
import type { Recipe } from '../types';
import { getApiError } from '../lib/api-error';

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await recipesApi.adminList();
      setRecipes(res.data.data);
    } catch (err: unknown) {
      setError(getApiError(err, 'Error al cargar recetas'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createRecipe = useCallback(async (data: Record<string, unknown>) => {
    try {
      const res = await recipesApi.create(data as Partial<Recipe> & { title: string; slug: string; method: string });
      setRecipes(prev => [...prev, res.data.data]);
      return res.data.data;
    } catch (err: unknown) {
      throw getApiError(err, 'Error al crear receta');
    }
  }, []);

  const updateRecipe = useCallback(async (id: string, data: Record<string, unknown>) => {
    try {
      const res = await recipesApi.update(id, data as Partial<Recipe> & { title: string; slug: string; method: string });
      setRecipes(prev => prev.map(r => r.id === id ? res.data.data : r));
      return res.data.data;
    } catch (err: unknown) {
      throw getApiError(err, 'Error al actualizar receta');
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      await recipesApi.delete(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err: unknown) {
      throw getApiError(err, 'Error al eliminar receta');
    }
  }, []);

  return {
    recipes,
    loading,
    error,
    load,
    createRecipe,
    updateRecipe,
    deleteRecipe,
  };
}
