import { useState } from 'react';
import { RecipesProvider, useRecipesContext } from '../context/RecipesContext';
import { recipesApi } from '../api';
import { useToast } from '../context/ToastContext';
import RecipeList from '../components/recipes/RecipeList';
import RecipeEditor from '../components/recipes/RecipeEditor';
import StepEditor from '../components/recipes/StepEditor';
import type { Recipe, RecipeStep } from '../types';
import type { RecipeFormData } from '../hooks/useRecipeForm';

// ─── Step modal state shape ──────────────────────────────────────────────────
interface StepModalState {
  recipeId: string;
  stepId?: string;
}

// ─── Inner component (must live inside RecipesProvider) ──────────────────────
function RecipesContent() {
  const { add } = useToast();
  const { recipes, loading, createRecipe, updateRecipe, deleteRecipe, refresh } = useRecipesContext();

  // Recipe editor modal state
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; recipe?: Recipe }>({ open: false });
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Step editor modal state
  const [stepModal, setStepModal] = useState<StepModalState | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // ── Recipe handlers ─────────────────────────────────────────────────────────

  const handleAddNew = () => setRecipeModal({ open: true });

  const handleEdit = (recipe: Recipe) => setRecipeModal({ open: true, recipe });

  const handleCloseRecipeModal = () => setRecipeModal({ open: false });

  const handleSaveRecipe = async (data: RecipeFormData) => {
    setSavingRecipe(true);
    try {
      const payload = {
        ...data,
        prepTime: data.prepTime ? parseInt(data.prepTime) : undefined,
        productId: data.productId || undefined,
      };
      if (recipeModal.recipe) {
        await updateRecipe(recipeModal.recipe.id, payload);
        add('Receta actualizada', 'success');
      } else {
        await createRecipe(payload);
        add('Receta creada', 'success');
      }
      setRecipeModal({ open: false });
      await refresh();
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al guardar receta', 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const handleDelete = async (recipe: Recipe) => {
    if (!confirm(`¿Eliminar "${recipe.title}" y todos sus pasos?`)) return;
    try {
      await deleteRecipe(recipe.id);
      add('Receta eliminada', 'success');
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  // ── Step handlers ────────────────────────────────────────────────────────────

  const handleAddStep = (recipeId: string) => {
    setStepModal({ recipeId });
  };

  const handleEditStep = (recipeId: string, step: RecipeStep) => {
    setStepModal({ recipeId, stepId: step.id });
  };

  const handleDeleteStep = async (recipeId: string, step: RecipeStep) => {
    if (!confirm(`¿Eliminar el paso "${step.title}"?`)) return;
    try {
      await recipesApi.deleteStep(recipeId, step.id);
      add('Paso eliminado', 'success');
      await refresh();
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al eliminar paso', 'error');
    }
  };

  const handleReorderStep = async (recipeId: string, stepIds: string[]) => {
    try {
      await recipesApi.reorderSteps(recipeId, stepIds);
      await refresh();
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al reordenar', 'error');
    }
  };

  const handleCloseStepModal = () => setStepModal(null);

  const handleSaveStep = async (data: Partial<RecipeStep>) => {
    if (!stepModal) return;
    setSavingStep(true);
    try {
      if (stepModal.stepId) {
        await recipesApi.updateStep(stepModal.recipeId, stepModal.stepId, data);
        add('Paso actualizado', 'success');
      } else {
        await recipesApi.addStep(stepModal.recipeId, data as Partial<RecipeStep> & { title: string; description: string });
        add('Paso agregado', 'success');
      }
      setStepModal(null);
      await refresh();
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al guardar paso', 'error');
    } finally {
      setSavingStep(false);
    }
  };

  // ── Resolve the step being edited (for StepEditor's step prop) ───────────────
  const editingStep = stepModal?.stepId
    ? recipes.find((r) => r.id === stepModal.recipeId)?.steps.find((s) => s.id === stepModal.stepId)
    : undefined;

  // ── Summary counts ────────────────────────────────────────────────────────────
  const published = recipes.filter((r) => r.isPublished).length;
  const premium = recipes.filter((r) => r.isPremium).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-2xl text-cream">Recetas</h1>
        <p className="text-coffee-400 text-sm">
          {recipes.length} total · {published} publicadas · {premium} premium
        </p>
      </div>

      <RecipeList
        recipes={recipes}
        loading={loading}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddNew={handleAddNew}
        onAddStep={handleAddStep}
        onEditStep={handleEditStep}
        onDeleteStep={handleDeleteStep}
        onReorderStep={handleReorderStep}
      />

      <RecipeEditor
        open={recipeModal.open}
        recipe={recipeModal.recipe}
        mode={recipeModal.recipe ? 'edit' : 'add'}
        onClose={handleCloseRecipeModal}
        onSave={handleSaveRecipe}
        loading={savingRecipe}
      />

      <StepEditor
        open={!!stepModal}
        step={editingStep}
        mode={stepModal?.stepId ? 'edit' : 'add'}
        onClose={handleCloseStepModal}
        onSave={handleSaveStep}
        loading={savingStep}
      />
    </div>
  );
}

// ─── Default export wraps with provider ──────────────────────────────────────
export default function AdminRecipes() {
  return (
    <RecipesProvider>
      <RecipesContent />
    </RecipesProvider>
  );
}
