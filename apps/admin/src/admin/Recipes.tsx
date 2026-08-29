import { useState } from 'react';
import { Search } from 'lucide-react';
import { RecipesProvider, useRecipesContext } from '../context/RecipesContext';
import { recipesApi } from '../api';
import { useModuleToast } from './context/ModuleContext';
import RecipeList from '../components/recipes/RecipeList';
import RecipeEditor from '../components/recipes/RecipeEditor';
import StepEditor from '../components/recipes/StepEditor';
import IngredientEditor from '../components/recipes/IngredientEditor';
import ConfirmDialog from './components/ConfirmDialog';
import type { Recipe, RecipeStep, RecipeIngredient, RecipeEquipment } from '../types';
import type { RecipeFormData } from '../hooks/useRecipeForm';
import { PageMeta } from '../hooks/usePageMeta';
import { getApiError } from '@12porciento/shared';

// ─── Step modal state shape ──────────────────────────────────────────────────
interface StepModalState {
  recipeId: string;
  stepId?: string;
}

// ─── Ingredient modal state shape ────────────────────────────────────────────
interface IngredientModalState {
  recipeId: string;
  ingredientId?: string;
}

// ─── Inner component (must live inside RecipesProvider) ────────────────────
function RecipesContent() {
  const { addToast } = useModuleToast();
  const { recipes, loading, createRecipe, updateRecipe, deleteRecipe, refresh } =
    useRecipesContext();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'premium'>(
    'all',
  );

  // Recipe editor modal state
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; recipe?: Recipe }>({
    open: false,
  });
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Step editor modal state
  const [stepModal, setStepModal] = useState<StepModalState | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Ingredient editor modal state
  const [ingredientModal, setIngredientModal] = useState<IngredientModalState | null>(null);
  const [savingIngredient, setSavingIngredient] = useState(false);

  // Delete confirm state
  const [confirmRecipe, setConfirmRecipe] = useState<Recipe | null>(null);
  const [confirmStep, setConfirmStep] = useState<{ recipeId: string; step: RecipeStep } | null>(
    null,
  );
  const [confirmIngredient, setConfirmIngredient] = useState<{
    recipeId: string;
    ingredient: RecipeIngredient;
  } | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [deletingStep, setDeletingStep] = useState(false);
  const [deletingIngredient, setDeletingIngredient] = useState(false);

  // ── Recipe handlers ────────────────────────────────────────────────────────

  const handleAddNew = () => setRecipeModal({ open: true });

  const handleEdit = (recipe: Recipe) => setRecipeModal({ open: true, recipe });

  const handleCloseRecipeModal = () => setRecipeModal({ open: false });

  const handleSaveRecipe = async (data: RecipeFormData) => {
    setSavingRecipe(true);
    try {
      const toNum = (v: string | undefined) =>
        v === undefined || v === '' ? null : Number(v);
      const payload = {
        ...data,
        prepTime:
          data.prepTime !== undefined && data.prepTime !== '' ? parseInt(data.prepTime) : undefined,
        productId: data.productId || undefined,
        brewMethodId: data.brewMethodId || undefined,
        coffeeDoseGrams: toNum(data.coffeeDoseGrams),
        waterGrams: toNum(data.waterGrams),
        waterTemperatureCelsius: toNum(data.waterTemperatureCelsius),
        grindTargetMicrons: toNum(data.grindTargetMicrons),
        profile: data.profile || undefined,
      };
      if (recipeModal.recipe) {
        await updateRecipe(recipeModal.recipe.id, payload);
        addToast('Receta actualizada', 'success');
      } else {
        await createRecipe(payload);
        addToast('Receta creada', 'success');
      }
      setRecipeModal({ open: false });
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al guardar receta'), 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDelete = (recipe: Recipe) => {
    setConfirmRecipe(recipe);
  };

  const doDeleteRecipe = async () => {
    if (!confirmRecipe) return;
    setDeletingRecipe(true);
    try {
      await deleteRecipe(confirmRecipe.id);
      addToast('Receta eliminada', 'success');
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al eliminar'), 'error');
    } finally {
      setDeletingRecipe(false);
      setConfirmRecipe(null);
    }
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleAddStep = (recipeId: string) => {
    setStepModal({ recipeId });
  };

  const handleEditStep = (recipeId: string, step: RecipeStep) => {
    setStepModal({ recipeId, stepId: step.id });
  };

  const handleDeleteStep = (recipeId: string, step: RecipeStep) => {
    setConfirmStep({ recipeId, step });
  };

  const doDeleteStep = async () => {
    if (!confirmStep) return;
    setDeletingStep(true);
    try {
      await recipesApi.deleteStep(confirmStep.recipeId, confirmStep.step.id);
      addToast('Paso eliminado', 'success');
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al eliminar paso'), 'error');
    } finally {
      setDeletingStep(false);
      setConfirmStep(null);
    }
  };

  const handleReorderStep = async (recipeId: string, stepIds: string[]) => {
    try {
      await recipesApi.reorderSteps(recipeId, stepIds);
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al reordenar'), 'error');
    }
  };

  const handleCloseStepModal = () => setStepModal(null);

  const handleSaveStep = async (data: Partial<RecipeStep>) => {
    if (!stepModal) return;
    setSavingStep(true);
    try {
      if (stepModal.stepId) {
        await recipesApi.updateStep(stepModal.recipeId, stepModal.stepId, data);
        addToast('Paso actualizado', 'success');
      } else {
        await recipesApi.addStep(
          stepModal.recipeId,
          data as Partial<RecipeStep> & { title: string; description: string },
        );
        addToast('Paso agregado', 'success');
      }
      setStepModal(null);
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al guardar paso'), 'error');
    } finally {
      setSavingStep(false);
    }
  };

  // ── Resolve the step being edited (for StepEditor's step prop) ─────────────
  const editingStep = stepModal?.stepId
    ? recipes.find((r) => r.id === stepModal.recipeId)?.steps.find((s) => s.id === stepModal.stepId)
    : undefined;

  // ── Ingredient handlers ─────────────────────────────────────────────────────

  const handleAddIngredient = (recipeId: string) => {
    setIngredientModal({ recipeId });
  };

  const handleEditIngredient = (recipeId: string, ingredient: RecipeIngredient) => {
    setIngredientModal({ recipeId, ingredientId: ingredient.id });
  };

  const handleDeleteIngredient = (recipeId: string, ingredient: RecipeIngredient) => {
    setConfirmIngredient({ recipeId, ingredient });
  };

  const doDeleteIngredient = async () => {
    if (!confirmIngredient) return;
    setDeletingIngredient(true);
    try {
      await recipesApi.deleteIngredient(
        confirmIngredient.recipeId,
        confirmIngredient.ingredient.id,
      );
      addToast('Ingrediente eliminado', 'success');
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al eliminar ingrediente'), 'error');
    } finally {
      setDeletingIngredient(false);
      setConfirmIngredient(null);
    }
  };

  const handleReorderIngredient = async (recipeId: string, ingredientIds: string[]) => {
    try {
      await recipesApi.reorderIngredients(recipeId, ingredientIds);
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al reordenar'), 'error');
    }
  };

  const handleCloseIngredientModal = () => setIngredientModal(null);

  const handleSaveIngredient = async (data: Partial<RecipeIngredient>) => {
    if (!ingredientModal) return;
    setSavingIngredient(true);
    try {
      if (ingredientModal.ingredientId) {
        await recipesApi.updateIngredient(
          ingredientModal.recipeId,
          ingredientModal.ingredientId,
          data,
        );
        addToast('Ingrediente actualizado', 'success');
      } else {
        await recipesApi.addIngredient(
          ingredientModal.recipeId,
          data as Partial<RecipeIngredient> & { name: string },
        );
        addToast('Ingrediente agregado', 'success');
      }
      setIngredientModal(null);
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al guardar ingrediente'), 'error');
    } finally {
      setSavingIngredient(false);
    }
  };

  const editingIngredient = ingredientModal?.ingredientId
    ? recipes
        .find((r) => r.id === ingredientModal.recipeId)
        ?.ingredients?.find((i) => i.id === ingredientModal.ingredientId)
    : undefined;

  // ── Equipment handlers ──────────────────────────────────────────────────────

  const handleAddEquipment = async (recipeId: string, name: string) => {
    try {
      await recipesApi.addEquipment(recipeId, { name });
      addToast('Equipo agregado', 'success');
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al agregar equipo'), 'error');
    }
  };

  const handleDeleteEquipment = async (recipeId: string, item: RecipeEquipment) => {
    try {
      await recipesApi.deleteEquipment(recipeId, item.id);
      addToast('Equipo eliminado', 'success');
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al eliminar equipo'), 'error');
    }
  };

  const handleReorderEquipment = async (recipeId: string, equipmentIds: string[]) => {
    try {
      await recipesApi.reorderEquipment(recipeId, equipmentIds);
      await refresh();
    } catch (err: unknown) {
      addToast(getApiError(err, 'Error al reordenar'), 'error');
    }
  };

  // ── Summary counts ────────────────────────────────────────────────────────
  const published = recipes.filter((r) => r.isPublished).length;
  const premium = recipes.filter((r) => r.isPremium).length;

  // ── Search + filter ──────────────────────────────────────────────────────
  const filtered = recipes.filter((recipe) => {
    const matchesSearch = !search || recipe.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'published' && recipe.isPublished && !recipe.isPremium) ||
      (statusFilter === 'draft' && !recipe.isPublished) ||
      (statusFilter === 'premium' && recipe.isPremium);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <PageMeta title="Recetas" noSuffix />
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-coffee-900 dark:text-cream">Recetas</h1>
        <p className="text-coffee-600 dark:text-coffee-400 text-sm">
          {recipes.length} total · {published} publicadas · {premium} premium
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-coffee-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar receta..."
          className="w-full bg-white dark:bg-coffee-800 border border-coffee-200 dark:border-coffee-700 text-coffee-900 dark:text-cream text-sm pl-9 pr-3 py-2.5 focus:outline-none focus:border-gold-500/50"
        />
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {(['all', 'published', 'draft', 'premium'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 border transition-all ${
              statusFilter === f
                ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                : 'border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-500'
            }`}
          >
            {f === 'all'
              ? 'Todas'
              : f === 'published'
                ? 'Publicadas'
                : f === 'draft'
                  ? 'Borradores'
                  : 'Premium'}
          </button>
        ))}
      </div>

      <RecipeList
        recipes={filtered}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNew={handleAddNew}
        onAddStep={handleAddStep}
        onEditStep={handleEditStep}
        onDeleteStep={handleDeleteStep}
        onReorderStep={handleReorderStep}
        onAddIngredient={handleAddIngredient}
        onEditIngredient={handleEditIngredient}
        onDeleteIngredient={handleDeleteIngredient}
        onReorderIngredient={handleReorderIngredient}
        onAddEquipment={handleAddEquipment}
        onDeleteEquipment={handleDeleteEquipment}
        onReorderEquipment={handleReorderEquipment}
      />

      {/* Mounted only while open + keyed by identity so the form re-initializes
          from fresh props each time (useRecipeForm/useState seed once per mount). */}
      {recipeModal.open && (
        <RecipeEditor
          key={recipeModal.recipe?.id ?? 'new'}
          open
          recipe={recipeModal.recipe}
          mode={recipeModal.recipe ? 'edit' : 'add'}
          onClose={handleCloseRecipeModal}
          onSave={handleSaveRecipe}
          loading={savingRecipe}
        />
      )}

      {stepModal && (
        <StepEditor
          key={stepModal.stepId ?? `new-${stepModal.recipeId}`}
          open
          step={editingStep}
          mode={stepModal.stepId ? 'edit' : 'add'}
          onClose={handleCloseStepModal}
          onSave={handleSaveStep}
          loading={savingStep}
        />
      )}

      {ingredientModal && (
        <IngredientEditor
          key={ingredientModal.ingredientId ?? `new-${ingredientModal.recipeId}`}
          open
          ingredient={editingIngredient}
          mode={ingredientModal.ingredientId ? 'edit' : 'add'}
          onClose={handleCloseIngredientModal}
          onSave={handleSaveIngredient}
          loading={savingIngredient}
        />
      )}

      <ConfirmDialog
        open={!!confirmRecipe}
        title="¿Eliminar receta?"
        message={`¿Eliminar "${confirmRecipe?.title}" y todos sus pasos? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        loading={deletingRecipe}
        onConfirm={doDeleteRecipe}
        onCancel={() => setConfirmRecipe(null)}
      />

      <ConfirmDialog
        open={!!confirmStep}
        title="¿Eliminar paso?"
        message={`¿Eliminar el paso "${confirmStep?.step.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        loading={deletingStep}
        onConfirm={doDeleteStep}
        onCancel={() => setConfirmStep(null)}
      />

      <ConfirmDialog
        open={!!confirmIngredient}
        title="¿Eliminar ingrediente?"
        message={`¿Eliminar "${confirmIngredient?.ingredient.name}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar"
        isDangerous
        loading={deletingIngredient}
        onConfirm={doDeleteIngredient}
        onCancel={() => setConfirmIngredient(null)}
      />
    </div>
  );
}

// ─── Default export wraps with provider ─────────────────────────────────────
export default function AdminRecipes() {
  return (
    <RecipesProvider>
      <RecipesContent />
    </RecipesProvider>
  );
}
