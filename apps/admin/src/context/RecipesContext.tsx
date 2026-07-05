import React, { createContext, useContext, ReactNode } from 'react';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types';

interface RecipesContextType {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  createRecipe: (data: Record<string, unknown>) => Promise<Recipe>;
  updateRecipe: (id: string, data: Record<string, unknown>) => Promise<Recipe>;
  deleteRecipe: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const RecipesContext = createContext<RecipesContextType | undefined>(undefined);

export function RecipesProvider({ children }: { children: ReactNode }) {
  const recipes = useRecipes();

  const value: RecipesContextType = {
    recipes: recipes.recipes,
    loading: recipes.loading,
    error: recipes.error,
    createRecipe: recipes.createRecipe,
    updateRecipe: recipes.updateRecipe,
    deleteRecipe: recipes.deleteRecipe,
    refresh: recipes.load,
  };

  return (
    <RecipesContext.Provider value={value}>
      {children}
    </RecipesContext.Provider>
  );
}

export function useRecipesContext() {
  const context = useContext(RecipesContext);
  if (!context) {
    throw new Error('useRecipesContext debe usarse dentro de RecipesProvider');
  }
  return context;
}
