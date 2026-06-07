import { useState, useCallback, useEffect } from 'react';
import { recipesApi } from '../api';
import type { Recipe } from '../types';

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
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar recetas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createRecipe = useCallback(async (data: any) => {
    try {
      const res = await recipesApi.create(data);
      setRecipes(prev => [...prev, res.data.data]);
      return res.data.data;
    } catch (err: any) {
      throw err.response?.data?.error || 'Error al crear receta';
    }
  }, []);

  const updateRecipe = useCallback(async (id: string, data: any) => {
    try {
      const res = await recipesApi.update(id, data);
      setRecipes(prev => prev.map(r => r.id === id ? res.data.data : r));
      return res.data.data;
    } catch (err: any) {
      throw err.response?.data?.error || 'Error al actualizar receta';
    }
  }, []);

  const deleteRecipe = useCallback(async (id: string) => {
    try {
      await recipesApi.delete(id);
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err: any) {
      throw err.response?.data?.error || 'Error al eliminar receta';
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
