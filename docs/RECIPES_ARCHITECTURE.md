# Recetas — Arquitectura

Sistema modular para gestionar recetas con pasos, producto relacionado y control de acceso premium.

## Estructura

### Context & Hooks (`client/src/`)
- `context/RecipesContext.tsx` — estado compartido: `{ recipes, loading, error, createRecipe, updateRecipe, deleteRecipe, refresh }`. Provee `useRecipesContext()`.
- `hooks/useRecipes.ts` — fetch (`adminList`) + CRUD con actualización optimista del estado local.
- `hooks/useRecipeForm.ts` — estado de formulario, validación (title/slug/method) y auto-generación de slug desde el título. Exporta `RecipeFormData`.

### Componentes (`client/src/components/recipes/`)
- `RecipeList.tsx` — lista con tabs de filtro (Todas/Publicadas/Borradores/Premium), filas expandibles, acciones editar/eliminar. Fila expandida renderiza `StepList`.
- `RecipeEditor.tsx` — modal crear/editar receta (usa `useRecipeForm` + `SearchableProductSelect`).
- `StepList.tsx` — lista de pasos con reordenamiento drag-and-drop (HTML nativo). Sincroniza orden con props vía `useEffect`.
- `StepEditor.tsx` — modal crear/editar paso (título, descripción, imagen, video, duración).

### Página Admin (`client/src/admin/`)
- `Recipes.tsx` — orquesta todo dentro de `RecipesProvider`. Editores se montan condicionalmente con `key` por identidad para re-sembrar el form en cada apertura.

### API (`server/src/routes/recipes.ts`, cliente `client/src/api/index.ts`)
Endpoints completos: list, getById, getBySlug, adminList, create, update, delete, addStep, updateStep, deleteStep, reorderSteps.

## Flujo de datos

1. **Cargar**: `RecipesProvider` → `useRecipes` → `recipesApi.adminList()` → estado `recipes`.
2. **Crear/Editar receta**: `RecipeEditor` → `handleSaveRecipe` → `createRecipe`/`updateRecipe` → `refresh()`.
3. **Eliminar receta**: confirm → `deleteRecipe` → filtra del estado.
4. **Pasos (add/edit/delete/reorder)**: handlers en `Recipes.tsx` → `recipesApi.*Step*` → `refresh()` para re-render con datos del servidor.

## Decisiones clave (bugs evitados)

- **Re-montaje de editores**: `useRecipeForm`/`useState` solo siembran datos al montar. Los editores se montan solo cuando `open` y llevan `key` por identidad → cada apertura re-inicializa el form (evita datos stale al editar otra receta/paso).
- **Sync de StepList**: `orderedSteps` (estado local para drag) se resincroniza con la prop `steps` vía `useEffect`, saltando mientras hay drag en curso → un paso agregado aparece sin remontar.
- **Reorder real**: `onReorder` solo dispara si el orden de IDs cambió (comparación por join de ids).

## Acceso premium

- Recetas con `isPremium: true` se restringen a suscriptores activos (verificado en endpoints públicos vía `hasRecipeAccess`).
- `lockRecipe` recorta pasos para usuarios sin acceso.
- Endpoints admin requieren auth.

## Tests

- `hooks/__tests__/useRecipes.test.ts` — unit del hook (carga, error, crear, eliminar) con `recipesApi` mockeado.
- `__tests__/admin/Recipes.integration.test.tsx` — integración (carga lista, abre modal, validación, filtros).
- Runner: Vitest + testing-library. `pnpm test` desde `client/`.
