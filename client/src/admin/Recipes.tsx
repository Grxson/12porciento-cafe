import { useState } from 'react';
import { Search } from 'lucide-react';
import { RecipesProvider, useRecipesContext } from '../context/RecipesContext';
import { recipesApi } from '../api';
import { useToast } from '../context/ToastContext';
import RecipeList from '../components/recipes/RecipeList';
import RecipeEditor from '../components/recipes/RecipeEditor';
import StepEditor from '../components/recipes/StepEditor';
import ConfirmDialog from './components/ConfirmDialog';
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

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'premium'>('all');

  // Recipe editor modal state
  const [recipeModal, setRecipeModal] = useState<{ open: boolean; recipe?: Recipe }>({ open: false });
  const [savingRecipe, setSavingRecipe] = useState(false);

  // Step editor modal state
  const [stepModal, setStepModal] = useState<StepModalState | null>(null);
  const [savingStep, setSavingStep] = useState(false);

  // Delete confirm state
  const [confirmRecipe, setConfirmRecipe] = useState<Recipe | null>(null);
  const [confirmStep, setConfirmStep] = useState<{ recipeId: string; step: RecipeStep } | null>(null);
  const [deletingRecipe, setDeletingRecipe] = useState(false);
  const [deletingStep, setDeletingStep] = useState(false);

  // ── Recipe handlers ─────────────────────────────────────────────────────────

  const handleAddNew = () => setRecipeModal({ open: true });

  const handleEdit = (recipe: Recipe) => setRecipeModal({ open: true, recipe });

  const handleCloseRecipeModal = () => setRecipeModal({ open: false });

  const handleSaveRecipe = async (data: RecipeFormData) => {
    setSavingRecipe(true);
    try {
      const payload = {
        ...data,
        prepTime: data.prepTime !== undefined && data.prepTime !== '' ? parseInt(data.prepTime) : undefined,
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

  const handleDelete = (recipe: Recipe) => {
    setConfirmRecipe(recipe);
  };

  const doDeleteRecipe = async () => {
    if (!confirmRecipe) return;
    setDeletingRecipe(true);
    try {
      await deleteRecipe(confirmRecipe.id);
      add('Receta eliminada', 'success');
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al eliminar', 'error');
    } finally {
      setDeletingRecipe(false);
      setConfirmRecipe(null);
    }
  };

  // ── Step handlers ────────────────────────────────────────────────────────────

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
      add('Paso eliminado', 'success');
      await refresh();
    } catch (err: any) {
      add(err?.response?.data?.error || 'Error al eliminar paso', 'error');
    } finally {
      setDeletingStep(false);
      setConfirmStep(null);
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

  // ── Search + filter ───────────────────────────────────────────────────────────
  const filtered = recipes.filter((recipe) => {
    const matchesSearch = !search || recipe.title.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'all'
      || (statusFilter === 'published' && recipe.isPublished && !recipe.isPremium)
      || (statusFilter === 'draft' && !recipe.isPublished)
      || (statusFilter === 'premium' && recipe.isPremium);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
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
      <div className="flex gap-2">
        {(['all', 'published', 'draft', 'premium'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`text-xs px-3 py-1.5 border transition-all ${
              statusFilter === f ? 'border-gold-500 text-gold-500 bg-gold-500/10' : 'border-coffee-200 dark:border-coffee-700 text-coffee-600 dark:text-coffee-400 hover:border-coffee-400 dark:hover:border-coffee-500'
            }`}
          >
            {f === 'all' ? 'Todas' : f === 'published' ? 'Publicadas' : f === 'draft' ? 'Borradores' : 'Premium'}
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
