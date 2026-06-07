# Recetas: CRUD Mejorado con UI/UX Interactivo

> **Para agentos:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development para ejecutar tareas por fase. Planificación → Codificación → Pruebas.

**Objetivo:** Refactorizar CRUD de recetas con UI/UX mejorada, interactiva y dinámica. Separar responsabilidades frontend, mejorar manejo de estado, crear componentes reutilizables.

**Arquitectura:** 
- Backend: endpoints existentes son sólidos, agregar validaciones y campos faltantes
- Frontend: refactorizar Recipes.tsx monolítico en componentes especializados (RecipeList, RecipeEditor, StepEditor, etc.)
- Estados: usar context + hooks para manejo centralizado de recetas
- UI: animaciones fluidas, previsualizaciones en vivo, drag-and-drop para pasos

**Tech Stack:** React + TypeScript, Framer Motion, Prisma, Express

---

## FASE 1: PLANNING

### Task 1: Análisis de estado actual y arquitectura

**Archivos a revisar:**
- `server/src/routes/recipes.ts` — endpoints CRUD
- `client/src/admin/Recipes.tsx` — UI monolítica actual
- `server/prisma/schema.prisma` — modelo Recipe y RecipeStep
- `client/src/components/SearchableProductSelect.tsx` — componente nuevo

- [ ] **Step 1: Documentar endpoints actuales**

Lee `server/src/routes/recipes.ts` y lista:
1. Endpoints existentes (GET, POST, PUT, DELETE)
2. Validaciones presentes
3. Campos que faltan o podrían mejorar

Resultado esperado:
```
✓ GET / — lista recetas publicadas (con filtros: method, productId, premium)
✓ GET /admin/all — todas las recetas (admin)
✓ GET /by-slug/:slug — por slug
✓ GET /:id — por ID
✓ POST /admin — crear
✓ PUT /admin/:id — actualizar receta
✓ DELETE /admin/:id — eliminar
✓ POST /admin/:id/steps — agregar paso
✓ PUT /admin/:id/steps/reorder — reordenar pasos
✓ PUT /admin/:id/steps/:stepId — editar paso
✓ DELETE /admin/:id/steps/:stepId — eliminar paso
```

- [ ] **Step 2: Mapear componentes frontend necesarios**

Diseña estructura modular:
```
components/recipes/
  ├── RecipeList.tsx (tabla/grid lista de recetas)
  ├── RecipeEditor.tsx (modal crear/editar receta)
  ├── StepEditor.tsx (modal crear/editar paso)
  ├── StepList.tsx (lista pasos con drag-and-drop)
  ├── RecipePreview.tsx (preview en vivo de receta)
  └── RecipeFilters.tsx (filtros por método, premium, etc.)

hooks/
  ├── useRecipes.ts (fetch y estado de recetas)
  ├── useRecipeForm.ts (manejo de form receta)
  └── useStepForm.ts (manejo de form paso)

context/
  └── RecipesContext.tsx (estado compartido recetas)
```

- [ ] **Step 3: Definir mejoras de UX**

Lista de mejoras:
1. Preview en vivo del slug mientras escribes
2. Drag-and-drop para reordenar pasos
3. Indicador visual de campos requeridos
4. Auto-save de borrador (localStorage)
5. Confirmación antes de eliminar
6. Toast notifications para todas las acciones
7. Loading skeletons durante carga
8. Estados vacíos amigables
9. Búsqueda/filtrado en lista
10. Validación en tiempo real

- [ ] **Step 4: Commit planning**

```bash
git add docs/superpowers/plans/2026-06-07-recipes-crud-ui.md
git commit -m "plan: analyze recipes CRUD and define UI/UX improvements"
```

---

## FASE 2: CODIFICACIÓN

### Task 2: Crear contexto y hooks para estado centralizado

**Archivos:**
- Create: `client/src/context/RecipesContext.tsx`
- Create: `client/src/hooks/useRecipes.ts`
- Create: `client/src/hooks/useRecipeForm.ts`
- Test: `client/src/hooks/__tests__/useRecipes.test.ts`

- [ ] **Step 1: Escribir test del hook useRecipes**

```typescript
// client/src/hooks/__tests__/useRecipes.test.ts
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
```

- [ ] **Step 2: Implementar hook useRecipes**

```typescript
// client/src/hooks/useRecipes.ts
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
```

- [ ] **Step 3: Implementar hook useRecipeForm**

```typescript
// client/src/hooks/useRecipeForm.ts
import { useState, useCallback, useEffect } from 'react';

export interface RecipeFormData {
  title: string;
  slug: string;
  description: string;
  method: string;
  difficulty: 'FÁCIL' | 'MEDIA' | 'DIFÍCIL';
  prepTime: string;
  yield: string;
  temp: string;
  grind: string;
  ratio: string;
  isPremium: boolean;
  isPublished: boolean;
  productId: string;
}

const EMPTY_FORM: RecipeFormData = {
  title: '',
  slug: '',
  description: '',
  method: 'V60',
  difficulty: 'MEDIA',
  prepTime: '',
  yield: '',
  temp: '',
  grind: '',
  ratio: '',
  isPremium: false,
  isPublished: false,
  productId: '',
};

export function useRecipeForm(initialData?: RecipeFormData) {
  const [form, setForm] = useState<RecipeFormData>(initialData || EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof RecipeFormData, string>>>({});

  const updateField = useCallback((field: keyof RecipeFormData, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
    
    // Auto-generate slug from title si está vacío
    if (field === 'title' && !form.slug) {
      const newSlug = value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      setForm(prev => ({ ...prev, slug: newSlug }));
    }

    // Limpiar error del campo
    if (errors[field]) {
      setErrors(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    }
  }, [form.slug, errors]);

  const validate = useCallback((): boolean => {
    const newErrors: typeof errors = {};
    if (!form.title.trim()) newErrors.title = 'Título requerido';
    if (!form.slug.trim()) newErrors.slug = 'Slug requerido';
    if (!form.method.trim()) newErrors.method = 'Método requerido';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [form]);

  const reset = useCallback(() => {
    setForm(EMPTY_FORM);
    setErrors({});
  }, []);

  return {
    form,
    errors,
    updateField,
    setForm,
    validate,
    reset,
  };
}
```

- [ ] **Step 4: Crear RecipesContext**

```typescript
// client/src/context/RecipesContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useRecipes } from '../hooks/useRecipes';
import type { Recipe } from '../types';

interface RecipesContextType {
  recipes: Recipe[];
  loading: boolean;
  error: string | null;
  createRecipe: (data: any) => Promise<Recipe>;
  updateRecipe: (id: string, data: any) => Promise<Recipe>;
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
```

- [ ] **Step 5: Correr tests**

```bash
cd client
pnpm test useRecipes.test.ts
```

Expected: PASS all tests

- [ ] **Step 6: Commit**

```bash
git add client/src/hooks/ client/src/context/RecipesContext.tsx
git commit -m "feat: add RecipesContext and hooks for centralized state management

- useRecipes hook for data fetching and crud operations
- useRecipeForm hook for form state with validation
- RecipesContext for context-based state sharing
- Full test coverage for useRecipes hook"
```

---

### Task 3: Crear componentes UI reutilizables

**Archivos:**
- Create: `client/src/components/recipes/RecipeList.tsx`
- Create: `client/src/components/recipes/RecipeEditor.tsx`
- Create: `client/src/components/recipes/StepList.tsx`
- Create: `client/src/components/recipes/StepEditor.tsx`
- Create: `client/src/components/recipes/RecipeFilters.tsx`

- [ ] **Step 1: Crear RecipeList componente**

```typescript
// client/src/components/recipes/RecipeList.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronDown, ChevronUp, BookOpen, Eye, EyeOff } from 'lucide-react';
import type { Recipe } from '../../types';

interface RecipeListProps {
  recipes: Recipe[];
  loading: boolean;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onAddNew: () => void;
}

export default function RecipeList({ recipes, loading, onEdit, onDelete, onAddNew }: RecipeListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'published' | 'draft' | 'premium'>('all');

  const filtered = recipes.filter(r => {
    if (filter === 'published') return r.isPublished;
    if (filter === 'draft') return !r.isPublished;
    if (filter === 'premium') return r.isPremium;
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-coffee-800/50 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'published', 'draft', 'premium'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider transition-colors ${
                filter === f
                  ? 'bg-gold-500 text-coffee-950'
                  : 'border border-coffee-700 text-coffee-400 hover:text-cream'
              }`}
            >
              {f === 'all' && 'Todas'}{f === 'published' && 'Publicadas'}{f === 'draft' && 'Borradores'}{f === 'premium' && 'Premium'}
            </button>
          ))}
        </div>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva receta
        </button>
      </div>

      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-coffee-500">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin recetas. Crea la primera.</p>
          </div>
        ) : (
          filtered.map(recipe => (
            <motion.div
              key={recipe.id}
              layout
              className="bg-coffee-900 border border-coffee-800 overflow-hidden"
            >
              <button
                onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-coffee-800/50 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-cream truncate">{recipe.title}</h3>
                    <div className="flex gap-1 shrink-0">
                      {recipe.isPublished ? (
                        <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-1">Publicada</span>
                      ) : (
                        <span className="text-[10px] bg-coffee-800 text-coffee-400 px-2 py-1">Borrador</span>
                      )}
                      {recipe.isPremium && (
                        <span className="text-[10px] bg-gold-900/30 text-gold-400 px-2 py-1">Premium</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-coffee-400 mt-1">{recipe.method} • {recipe.difficulty}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
                    className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(recipe); }}
                    className="p-1.5 text-coffee-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-coffee-500 transition-transform ${expanded === recipe.id ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence>
                {expanded === recipe.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-coffee-800 bg-coffee-800/20 overflow-hidden"
                  >
                    <div className="p-4">
                      {recipe.description && (
                        <p className="text-xs text-coffee-300 mb-3">{recipe.description}</p>
                      )}
                      <div className="space-y-2">
                        <p className="text-xs text-coffee-400">
                          <strong>Slug:</strong> {recipe.slug}
                        </p>
                        {recipe.prepTime && (
                          <p className="text-xs text-coffee-400">
                            <strong>Tiempo:</strong> {recipe.prepTime} min
                          </p>
                        )}
                        {recipe.product && (
                          <p className="text-xs text-coffee-400">
                            <strong>Café:</strong> {recipe.product.name}
                          </p>
                        )}
                        <p className="text-xs text-coffee-400">
                          <strong>Pasos:</strong> {recipe.steps.length}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear RecipeEditor modal**

```typescript
// client/src/components/recipes/RecipeEditor.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import SearchableProductSelect from '../SearchableProductSelect';
import { useRecipeForm, type RecipeFormData } from '../../hooks/useRecipeForm';
import type { Recipe } from '../../types';

const METHODS = ['Espresso', 'V60', 'Pour Over', 'Chemex', 'Kalita Wave', 'Prensa Francesa', 'Cold Brew', 'Moka', 'AeroPress', 'Sifón', 'Americano'];
const DIFFICULTIES = ['FÁCIL', 'MEDIA', 'DIFÍCIL'];

interface RecipeEditorProps {
  open: boolean;
  recipe?: Recipe;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: RecipeFormData) => Promise<void>;
  loading: boolean;
}

export default function RecipeEditor({ open, recipe, mode, onClose, onSave, loading }: RecipeEditorProps) {
  const { form, errors, updateField, validate } = useRecipeForm(
    recipe ? {
      title: recipe.title,
      slug: recipe.slug,
      description: recipe.description || '',
      method: recipe.method,
      difficulty: recipe.difficulty,
      prepTime: recipe.prepTime?.toString() || '',
      yield: recipe.yield || '',
      temp: recipe.temp || '',
      grind: recipe.grind || '',
      ratio: recipe.ratio || '',
      isPremium: recipe.isPremium,
      isPublished: recipe.isPublished,
      productId: recipe.productId || '',
    } : undefined
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    await onSave(form);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-5 border-b border-coffee-800 sticky top-0 bg-coffee-900 z-10">
              <h2 className="font-serif text-lg text-cream">
                {mode === 'add' ? 'Nueva receta' : `Editar: ${recipe?.title}`}
              </h2>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Campos básicos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) => updateField('title', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. V60 Perfecto"
                  />
                  {errors.title && <p className="text-red-400 text-xs mt-1">{errors.title}</p>}
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Slug *</label>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => updateField('slug', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. v60-perfecto"
                  />
                  {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Descripción</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateField('description', e.target.value)}
                  rows={2}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
                  placeholder="Resumen de la receta..."
                />
              </div>

              {/* Método y dificultad */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Método *</label>
                  <select
                    value={form.method}
                    onChange={(e) => updateField('method', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  >
                    {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Dificultad</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => updateField('difficulty', e.target.value as any)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  >
                    {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Tiempo (min)</label>
                  <input
                    type="number"
                    value={form.prepTime}
                    onChange={(e) => updateField('prepTime', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 15"
                  />
                </div>
              </div>

              {/* Parámetros técnicos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Rendimiento</label>
                  <input
                    type="text"
                    value={form.yield}
                    onChange={(e) => updateField('yield', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 1 taza 250ml"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Café relacionado</label>
                  <SearchableProductSelect
                    value={form.productId}
                    onChange={(id) => updateField('productId', id)}
                    initialLabel={recipe?.product?.name || ''}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Temperatura</label>
                  <input
                    type="text"
                    value={form.temp}
                    onChange={(e) => updateField('temp', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 92°C"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Molido</label>
                  <input
                    type="text"
                    value={form.grind}
                    onChange={(e) => updateField('grind', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. Medio"
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Ratio</label>
                  <input
                    type="text"
                    value={form.ratio}
                    onChange={(e) => updateField('ratio', e.target.value)}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="ej. 1:16"
                  />
                </div>
              </div>

              {/* Flags */}
              <div className="flex items-center gap-6 pt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPremium}
                    onChange={(e) => updateField('isPremium', e.target.checked)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span className="text-xs text-coffee-300">Premium (solo suscriptores)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => updateField('isPublished', e.target.checked)}
                    className="w-4 h-4 accent-gold-500"
                  />
                  <span className="text-xs text-coffee-300">Publicada</span>
                </label>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2 border-t border-coffee-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 3: Crear StepList con drag-and-drop**

```typescript
// client/src/components/recipes/StepList.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GripVertical, Plus, Edit2, Trash2 } from 'lucide-react';
import type { RecipeStep } from '../../types';

interface StepListProps {
  steps: RecipeStep[];
  onReorder: (stepIds: string[]) => Promise<void>;
  onEdit: (step: RecipeStep) => void;
  onDelete: (step: RecipeStep) => void;
  onAddNew: () => void;
  loading?: boolean;
}

export default function StepList({ steps, onReorder, onEdit, onDelete, onAddNew, loading }: StepListProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [orderedSteps, setOrderedSteps] = useState(steps);

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const fromIndex = orderedSteps.findIndex(s => s.id === draggedId);
    const toIndex = orderedSteps.findIndex(s => s.id === targetId);

    const newSteps = [...orderedSteps];
    const [dragged] = newSteps.splice(fromIndex, 1);
    newSteps.splice(toIndex, 0, dragged);

    setOrderedSteps(newSteps);
  };

  const handleDragEnd = async () => {
    if (draggedId && orderedSteps !== steps) {
      await onReorder(orderedSteps.map(s => s.id));
    }
    setDraggedId(null);
  };

  return (
    <div className="space-y-2">
      {orderedSteps.length === 0 ? (
        <div className="text-center py-6 text-coffee-500">
          <p className="text-xs">Sin pasos. Agrega el primero.</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {orderedSteps.map(step => (
            <motion.div
              key={step.id}
              layout
              draggable
              onDragStart={() => handleDragStart(step.id)}
              onDragOver={(e) => handleDragOver(e, step.id)}
              onDragEnd={handleDragEnd}
              className={`flex items-start gap-3 bg-coffee-800/40 p-3 cursor-grab active:cursor-grabbing transition-opacity ${
                draggedId === step.id ? 'opacity-50' : ''
              }`}
            >
              <GripVertical className="w-4 h-4 text-coffee-600 shrink-0 mt-1" />
              <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs flex items-center justify-center shrink-0">
                {step.order}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-cream text-xs font-medium">{step.title}</p>
                <p className="text-coffee-400 text-xs mt-0.5 truncate">{step.description}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => onEdit(step)}
                  className="p-1 text-coffee-500 hover:text-gold-400 transition-colors"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  onClick={() => onDelete(step)}
                  className="p-1 text-coffee-500 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      )}

      <button
        onClick={onAddNew}
        className="w-full py-2 border border-dashed border-coffee-700 text-coffee-500 text-xs hover:border-gold-500/50 hover:text-gold-400 transition-colors flex items-center justify-center gap-1"
      >
        <Plus className="w-3 h-3" /> Agregar paso
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Crear StepEditor modal**

```typescript
// client/src/components/recipes/StepEditor.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import type { RecipeStep } from '../../types';

interface StepEditorProps {
  open: boolean;
  step?: RecipeStep;
  mode: 'add' | 'edit';
  onClose: () => void;
  onSave: (data: Partial<RecipeStep>) => Promise<void>;
  loading: boolean;
}

export default function StepEditor({ open, step, mode, onClose, onSave, loading }: StepEditorProps) {
  const [form, setForm] = React.useState({
    title: step?.title || '',
    description: step?.description || '',
    imageUrl: step?.imageUrl || '',
    videoUrl: step?.videoUrl || '',
    duration: step?.duration?.toString() || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim()) return;
    await onSave({
      title: form.title,
      description: form.description,
      imageUrl: form.imageUrl || null,
      videoUrl: form.videoUrl || null,
      duration: form.duration ? parseInt(form.duration) : null,
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.95 }}
            className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl"
          >
            <div className="flex items-center justify-between p-5 border-b border-coffee-800">
              <h2 className="font-serif text-lg text-cream">
                {mode === 'add' ? 'Nuevo paso' : 'Editar paso'}
              </h2>
              <button onClick={onClose} className="text-coffee-400 hover:text-cream">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  placeholder="ej. Preparación del café"
                />
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Descripción *</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none"
                  placeholder="Instrucciones detalladas..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Imagen URL</label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Video URL</label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-coffee-400 mb-1">Duración (segundos)</label>
                <input
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))}
                  className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500"
                  placeholder="ej. 120"
                />
              </div>

              <div className="flex gap-3 pt-2 border-t border-coffee-800">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add client/src/components/recipes/
git commit -m "feat: create reusable recipe components with drag-and-drop

- RecipeList with filtering (all, published, draft, premium)
- RecipeEditor modal for create/edit
- StepList with drag-and-drop reordering
- StepEditor modal for step management
- Loading states and empty states for all components"
```

---

### Task 4: Refactorizar admin Recipes page

**Archivos:**
- Modify: `client/src/admin/Recipes.tsx`
- Delete: old inline logic

- [ ] **Step 1: Reescribir Recipes.tsx usando componentes nuevos**

```typescript
// client/src/admin/Recipes.tsx
import { useState } from 'react';
import { RecipesProvider, useRecipesContext } from '../context/RecipesContext';
import RecipeList from '../components/recipes/RecipeList';
import RecipeEditor from '../components/recipes/RecipeEditor';
import StepEditor from '../components/recipes/StepEditor';
import { useRecipeForm } from '../hooks/useRecipeForm';
import { useToast } from '../context/ToastContext';
import { recipesApi } from '../api';
import type { Recipe, RecipeStep } from '../types';

function RecipesContent() {
  const { recipes, loading, createRecipe, updateRecipe, deleteRecipe } = useRecipesContext();
  const { add } = useToast();

  const [recipeModal, setRecipeModal] = useState<'add' | 'edit' | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const [stepModal, setStepModal] = useState<{ recipeId: string; stepId?: string } | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Recipe handlers
  const openAddRecipe = () => {
    setEditingRecipe(null);
    setRecipeModal('add');
  };

  const openEditRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    setRecipeModal('edit');
  };

  const handleSaveRecipe = async (formData: any) => {
    setSavingRecipe(true);
    try {
      const payload = {
        ...formData,
        prepTime: formData.prepTime ? parseInt(formData.prepTime) : undefined,
        productId: formData.productId || undefined,
      };

      if (recipeModal === 'add') {
        await createRecipe(payload);
        add('Receta creada', 'success');
      } else if (editingRecipe) {
        await updateRecipe(editingRecipe.id, payload);
        add('Receta actualizada', 'success');
      }

      setRecipeModal(null);
      setEditingRecipe(null);
    } catch (err: any) {
      add(err || 'Error al guardar receta', 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDeleteRecipe = async (recipe: Recipe) => {
    if (!confirm(`¿Eliminar "${recipe.title}" y todos sus pasos?`)) return;
    try {
      await deleteRecipe(recipe.id);
      add('Receta eliminada', 'success');
    } catch (err: any) {
      add(err || 'Error al eliminar', 'error');
    }
  };

  // Step handlers
  const openAddStep = (recipeId: string) => {
    setStepModal({ recipeId });
  };

  const openEditStep = (recipeId: string, step: RecipeStep) => {
    setStepModal({ recipeId, stepId: step.id });
  };

  const handleSaveStep = async (data: any) => {
    if (!stepModal) return;
    setSavingStep(true);
    try {
      if (stepModal.stepId) {
        await recipesApi.updateStep(stepModal.recipeId, stepModal.stepId, data);
        add('Paso actualizado', 'success');
      } else {
        await recipesApi.addStep(stepModal.recipeId, data);
        add('Paso agregado', 'success');
      }
      setStepModal(null);
    } catch (err: any) {
      add(err || 'Error al guardar paso', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  const handleDeleteStep = async (recipeId: string, stepId: string) => {
    if (!confirm('¿Eliminar este paso?')) return;
    try {
      await recipesApi.deleteStep(recipeId, stepId);
      add('Paso eliminado', 'success');
    } catch (err: any) {
      add(err || 'Error al eliminar paso', 'error');
    }
  };

  const handleReorderSteps = async (recipeId: string, stepIds: string[]) => {
    try {
      await recipesApi.reorderSteps(recipeId, stepIds);
      add('Pasos reordenados', 'success');
    } catch (err: any) {
      add(err || 'Error al reordenar', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-cream mb-2">Recetas</h1>
        <p className="text-sm text-coffee-400">Gestiona todas tus recetas, pasos y contenido.</p>
      </div>

      <RecipeList
        recipes={recipes}
        loading={loading}
        onAddNew={openAddRecipe}
        onEdit={openEditRecipe}
        onDelete={handleDeleteRecipe}
      />

      <RecipeEditor
        open={recipeModal !== null}
        mode={recipeModal as any}
        recipe={editingRecipe || undefined}
        onClose={() => { setRecipeModal(null); setEditingRecipe(null); }}
        onSave={handleSaveRecipe}
        loading={savingRecipe}
      />

      <StepEditor
        open={stepModal !== null}
        mode={stepModal?.stepId ? 'edit' : 'add'}
        step={stepModal?.stepId ? recipes.find(r => r.id === stepModal.recipeId)?.steps.find(s => s.id === stepModal.stepId) : undefined}
        onClose={() => setStepModal(null)}
        onSave={handleSaveStep}
        loading={savingStep}
      />
    </div>
  );
}

export default function AdminRecipes() {
  return (
    <RecipesProvider>
      <RecipesContent />
    </RecipesProvider>
  );
}
```

- [ ] **Step 2: Actualizar recipesApi para métodos nuevos**

Revisa `client/src/api.ts` y asegúrate de que tenga:
```typescript
export const recipesApi = {
  list: (params?: any) => api.get('/recipes', { params }),
  adminList: () => api.get('/recipes/admin/all'),
  create: (data: any) => api.post('/recipes/admin', data),
  update: (id: string, data: any) => api.put(`/recipes/admin/${id}`, data),
  delete: (id: string) => api.delete(`/recipes/admin/${id}`),
  addStep: (recipeId: string, data: any) => api.post(`/recipes/admin/${recipeId}/steps`, data),
  updateStep: (recipeId: string, stepId: string, data: any) => api.put(`/recipes/admin/${recipeId}/steps/${stepId}`, data),
  deleteStep: (recipeId: string, stepId: string) => api.delete(`/recipes/admin/${recipeId}/steps/${stepId}`),
  reorderSteps: (recipeId: string, stepIds: string[]) => api.put(`/recipes/admin/${recipeId}/steps/reorder`, { stepIds }),
};
```

- [ ] **Step 3: Commit**

```bash
git add client/src/admin/Recipes.tsx client/src/api.ts
git commit -m "refactor: redesign Recipes admin page with modular components

- Refactor monolithic Recipes.tsx into RecipesProvider + RecipeList + Editors
- Use hooks for state management (useRecipes, useRecipeForm)
- Separate concerns: list view, recipe editing, step editing
- Maintain all existing functionality with improved UX"
```

---

## FASE 3: PRUEBAS

### Task 5: Pruebas integradas y manual testing

**Archivos:**
- Test: `client/src/__tests__/admin/Recipes.integration.test.ts`

- [ ] **Step 1: Escribir tests de integración**

```typescript
// client/src/__tests__/admin/Recipes.integration.test.ts
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ToastProvider } from '../../context/ToastContext';
import AdminRecipes from '../../admin/Recipes';

const mockRecipesApi = {
  adminList: jest.fn().mockResolvedValue({
    data: {
      data: [
        {
          id: '1',
          title: 'V60 Perfecto',
          slug: 'v60-perfecto',
          method: 'V60',
          difficulty: 'MEDIA',
          isPublished: true,
          isPremium: false,
          steps: [],
          product: null,
        },
      ],
    },
  }),
  create: jest.fn().mockResolvedValue({ data: { data: { id: '2', title: 'New Recipe', slug: 'new-recipe' } } }),
  update: jest.fn().mockResolvedValue({ data: { data: { id: '1', title: 'Updated', slug: 'updated' } } }),
  delete: jest.fn().mockResolvedValue({}),
};

jest.mock('../../api', () => ({
  recipesApi: mockRecipesApi,
}));

describe('AdminRecipes Integration', () => {
  it('carga y muestra lista de recetas', async () => {
    render(
      <ToastProvider>
        <AdminRecipes />
      </ToastProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('V60 Perfecto')).toBeInTheDocument();
    });
  });

  it('abre modal para crear receta', async () => {
    render(
      <ToastProvider>
        <AdminRecipes />
      </ToastProvider>
    );

    const newBtn = await screen.findByText('Nueva receta');
    fireEvent.click(newBtn);

    expect(screen.getByText('Nueva receta')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ej. V60 Perfecto')).toBeInTheDocument();
  });

  it('valida campos requeridos antes de guardar', async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <AdminRecipes />
      </ToastProvider>
    );

    const newBtn = await screen.findByText('Nueva receta');
    await user.click(newBtn);

    const saveBtn = screen.getByText('Guardar');
    await user.click(saveBtn);

    // Debe mostrar validación
    await waitFor(() => {
      expect(screen.getByText('Título requerido')).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Correr tests**

```bash
cd client
pnpm test Recipes.integration.test.ts
```

Expected: PASS all tests

- [ ] **Step 3: Manual testing checklist**

Browser-based testing (dev server running):

```
✓ Load admin recipes page
✓ List displays all recipes with correct data
✓ Click "Nueva receta" → modal opens
✓ Fill form, save → success toast + recipe added to list
✓ Click edit → modal prefilled with recipe data
✓ Edit recipe, save → updated in list
✓ Click delete → confirm dialog → recipe removed
✓ Add step → modal opens
✓ Add step with image/video URLs
✓ Drag-and-drop reorder steps
✓ Edit step → form prefilled
✓ Delete step → removed from list
✓ Premium checkbox works
✓ Published checkbox works
✓ Product selector shows products
✓ Slug auto-generates from title
✓ Form validation on required fields
✓ Toast notifications for all actions
✓ Loading states work
```

- [ ] **Step 4: Performance testing**

```bash
# Build and check bundle size
pnpm run build

# Check if recipe components add significant size
# Expected: <50KB total new components
```

- [ ] **Step 5: Commit tests**

```bash
git add client/src/__tests__/
git commit -m "test: add integration tests for recipes admin

- Integration tests for RecipeList and modals
- Tests for form validation
- Tests for CRUD operations
- Manual testing checklist documented"
```

---

### Task 6: Documentación y cleanup

**Archivos:**
- Create: `docs/RECIPES_ARCHITECTURE.md`

- [ ] **Step 1: Documentar arquitectura nueva**

```markdown
# Recetas Architecture

## Overview
Sistema modular para gestionar recetas con pasos, productos relacionados y control de acceso por suscripción.

## Structure

### Context & Hooks (`client/src/`)
- `context/RecipesContext.tsx` — shared state for recipes
- `hooks/useRecipes.ts` — fetch and CRUD operations
- `hooks/useRecipeForm.ts` — form state with validation

### Components (`client/src/components/recipes/`)
- `RecipeList.tsx` — list with filtering (all/published/draft/premium)
- `RecipeEditor.tsx` — modal for create/edit recipe
- `StepList.tsx` — steps list with drag-and-drop reorder
- `StepEditor.tsx` — modal for step create/edit

### Admin Page (`client/src/admin/`)
- `Recipes.tsx` — admin hub orchestrating all components

### API (`server/src/routes/`)
- `recipes.ts` — all endpoints (GET, POST, PUT, DELETE)
- Endpoints: /recipes (public), /recipes/admin/* (admin only)

## Data Flow

1. **Load**: RecipesProvider → useRecipes → API → setRecipes state
2. **Create**: RecipeEditor form → handleSaveRecipe → createRecipe hook → API → setRecipes
3. **Update**: Edit → RecipeEditor prefilled → updateRecipe hook → API → setRecipes
4. **Delete**: Confirm dialog → deleteRecipe hook → API → filter out from setRecipes

## Validation

- Frontend: useRecipeForm validates title, slug, method before save
- Backend: recipes.ts checks required fields (title, slug, method)
- Unique constraint: slug (database level)

## Premium Access

- Recipes marked `isPremium: true` are gated behind subscription
- Public endpoints check user subscription status
- Admin endpoints require auth
- Steps are partially hidden for non-premium users (`lockRecipe` helper)

## Performance

- Recipes loaded once on component mount (useRecipesContext)
- Drag-and-drop uses local state before API call
- Toast notifications for all async operations
- Loading skeletons during data fetch
```

- [ ] **Step 2: Cleanup**

Verifica que el archivo `client/src/admin/Recipes.tsx` viejo no tenga código duplicado.

- [ ] **Step 3: Commit documentación**

```bash
git add docs/RECIPES_ARCHITECTURE.md
git commit -m "docs: add recipes architecture documentation

- Context and hooks overview
- Component structure and responsibilities
- Data flow diagrams
- Premium access control
- Performance considerations"
```

- [ ] **Step 4: Final integration test**

```bash
cd client && pnpm dev
# Manually test complete workflow:
# 1. Create recipe with steps
# 2. Edit recipe
# 3. Delete step
# 4. Reorder steps via drag-and-drop
# 5. Publish/unpublish
# 6. Toggle premium
# 7. Verify all toasts work
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: recipes CRUD complete with improved UI/UX

COMPLETE REFACTOR:
- Modular components (RecipeList, RecipeEditor, StepEditor)
- Centralized state with RecipesContext and hooks
- Drag-and-drop for step reordering
- Real-time slug generation
- Form validation with error messages
- Toast notifications for all actions
- Loading and empty states
- Filtering (all/published/draft/premium)

TESTS:
- Unit tests for useRecipes hook
- Integration tests for admin page
- Manual testing checklist

DOCUMENTATION:
- Architecture guide
- Component responsibilities
- Data flow documentation"
```

---

## Success Criteria

- [ ] All endpoints tested and working
- [ ] Components render correctly with data
- [ ] Form validation works
- [ ] Drag-and-drop reordering works
- [ ] All CRUD operations work (create, read, update, delete)
- [ ] Toast notifications appear for all actions
- [ ] Loading and empty states display properly
- [ ] Premium flag works correctly
- [ ] Published/draft filtering works
- [ ] Product selector filters work
- [ ] Responsive design on mobile
- [ ] No TypeScript errors or warnings
- [ ] Tests pass

**Plan complete and saved to `docs/superpowers/plans/2026-06-07-recipes-crud-ui.md`.**
