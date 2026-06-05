import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, X, ChevronUp, ChevronDown, Eye, EyeOff, Star, BookOpen } from 'lucide-react';
import { recipesApi, productsApi } from '../api';
import { useToast } from '../context/ToastContext';
import type { Recipe, RecipeStep } from '../types';

const METHODS = ['Espresso', 'V60', 'Pour Over', 'Chemex', 'Kalita Wave', 'Prensa Francesa', 'Cold Brew', 'Moka', 'AeroPress', 'Sifón', 'Americano'];
const DIFFICULTIES = ['FÁCIL', 'MEDIA', 'DIFÍCIL'];

const emptyRecipeForm = {
  title: '', slug: '', description: '', method: 'V60', difficulty: 'MEDIA',
  prepTime: '', yield: '', temp: '', grind: '', ratio: '',
  isPremium: false, isPublished: false, productId: '',
};

const emptyStepForm = { title: '', description: '', imageUrl: '', videoUrl: '', duration: '' };

export default function AdminRecipes() {
  const { add } = useToast();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const [recipeModal, setRecipeModal] = useState<'add' | 'edit' | null>(null);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [editRecipeId, setEditRecipeId] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState(false);

  const [stepModal, setStepModal] = useState<{ recipeId: string; stepId?: string } | null>(null);
  const [stepForm, setStepForm] = useState(emptyStepForm);
  const [savingStep, setSavingStep] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [recipeRes, productRes] = await Promise.all([
        recipesApi.adminList(),
        productsApi.adminList(),
      ]);
      setRecipes(recipeRes.data.data);
      setProducts((productRes.data as any[]).map((p: any) => ({ id: p.id, name: p.name })));
    } catch {
      add('Error al cargar recetas', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAddRecipe = () => { setRecipeForm(emptyRecipeForm); setEditRecipeId(null); setRecipeModal('add'); };

  const openEditRecipe = (r: Recipe) => {
    setRecipeForm({
      title: r.title, slug: r.slug, description: r.description ?? '',
      method: r.method, difficulty: r.difficulty,
      prepTime: r.prepTime?.toString() ?? '', yield: r.yield ?? '',
      temp: r.temp ?? '', grind: r.grind ?? '', ratio: r.ratio ?? '',
      isPremium: r.isPremium, isPublished: r.isPublished,
      productId: r.productId ?? '',
    });
    setEditRecipeId(r.id);
    setRecipeModal('edit');
  };

  const saveRecipe = async () => {
    if (!recipeForm.title.trim() || !recipeForm.slug.trim() || !recipeForm.method) {
      add('Título, slug y método son requeridos', 'error');
      return;
    }
    setSavingRecipe(true);
    try {
      const payload = {
        ...recipeForm,
        prepTime: recipeForm.prepTime ? parseInt(recipeForm.prepTime) : undefined,
        productId: recipeForm.productId || undefined,
      };
      if (recipeModal === 'add') {
        await recipesApi.create(payload as any);
        add('Receta creada', 'success');
      } else if (editRecipeId) {
        await recipesApi.update(editRecipeId, payload as any);
        add('Receta actualizada', 'success');
      }
      setRecipeModal(null);
      load();
    } catch (err: any) {
      add(err.response?.data?.error ?? 'Error al guardar receta', 'error');
    } finally {
      setSavingRecipe(false);
    }
  };

  const deleteRecipe = async (id: string) => {
    if (!confirm('¿Eliminar esta receta y todos sus pasos?')) return;
    try {
      await recipesApi.delete(id);
      add('Receta eliminada', 'success');
      load();
    } catch { add('Error al eliminar', 'error'); }
  };

  const togglePublished = async (r: Recipe) => {
    try {
      await recipesApi.update(r.id, { isPublished: !r.isPublished });
      add(r.isPublished ? 'Receta despublicada' : 'Receta publicada', 'success');
      load();
    } catch { add('Error', 'error'); }
  };

  const openAddStep = (recipeId: string) => { setStepForm(emptyStepForm); setStepModal({ recipeId }); };

  const openEditStep = (recipeId: string, step: RecipeStep) => {
    setStepForm({
      title: step.title, description: step.description,
      imageUrl: step.imageUrl ?? '', videoUrl: step.videoUrl ?? '',
      duration: step.duration?.toString() ?? '',
    });
    setStepModal({ recipeId, stepId: step.id });
  };

  const saveStep = async () => {
    if (!stepModal) return;
    if (!stepForm.title.trim() || !stepForm.description.trim()) {
      add('Título y descripción son requeridos', 'error');
      return;
    }
    setSavingStep(true);
    try {
      const payload = {
        ...stepForm,
        duration: stepForm.duration ? parseInt(stepForm.duration) : undefined,
        imageUrl: stepForm.imageUrl || undefined,
        videoUrl: stepForm.videoUrl || undefined,
      };
      if (stepModal.stepId) {
        await recipesApi.updateStep(stepModal.recipeId, stepModal.stepId, payload);
        add('Paso actualizado', 'success');
      } else {
        await recipesApi.addStep(stepModal.recipeId, payload as any);
        add('Paso agregado', 'success');
      }
      setStepModal(null);
      load();
    } catch { add('Error al guardar paso', 'error'); } finally { setSavingStep(false); }
  };

  const deleteStep = async (recipeId: string, stepId: string) => {
    try {
      await recipesApi.deleteStep(recipeId, stepId);
      add('Paso eliminado', 'success');
      load();
    } catch { add('Error', 'error'); }
  };

  const moveStep = async (recipeId: string, steps: RecipeStep[], fromIdx: number, toIdx: number) => {
    const reordered = [...steps];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    try {
      await recipesApi.reorderSteps(recipeId, reordered.map((s) => s.id));
      load();
    } catch { add('Error al reordenar', 'error'); }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-coffee-400 text-sm">{recipes.length} recetas · {recipes.filter((r) => r.isPublished).length} publicadas · {recipes.filter((r) => r.isPremium).length} premium</p>
        <button onClick={openAddRecipe} className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors">
          <Plus className="w-4 h-4" /> Nueva receta
        </button>
      </div>

      <div className="space-y-3">
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-coffee-900 border border-coffee-800">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3 min-w-0">
                <BookOpen className="w-4 h-4 text-gold-400 shrink-0" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-cream text-sm font-medium truncate">{recipe.title}</p>
                    {recipe.isPremium && <Star className="w-3 h-3 text-gold-400 shrink-0" />}
                    {!recipe.isPublished && <span className="text-[10px] text-coffee-500 bg-coffee-800 px-1.5 py-0.5">Borrador</span>}
                  </div>
                  <p className="text-coffee-500 text-xs">{recipe.method} · {(recipe as any)._count?.steps ?? recipe.steps.length} pasos</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => togglePublished(recipe)} title={recipe.isPublished ? 'Despublicar' : 'Publicar'}
                  className="p-1.5 text-coffee-500 hover:text-cream transition-colors">
                  {recipe.isPublished ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <button onClick={() => openEditRecipe(recipe)} className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors">
                  <Edit2 className="w-4 h-4" />
                </button>
                <button onClick={() => deleteRecipe(recipe.id)} className="p-1.5 text-coffee-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
                <button onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                  className="p-1.5 text-coffee-500 hover:text-cream transition-colors">
                  {expanded === recipe.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <AnimatePresence>
              {expanded === recipe.id && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-coffee-800">
                  <div className="p-4 space-y-2">
                    {recipe.steps.map((step, i) => (
                      <div key={step.id} className="flex items-start gap-3 bg-coffee-800/40 p-3">
                        <span className="w-6 h-6 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 text-xs flex items-center justify-center shrink-0">{step.order}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-cream text-xs font-medium">{step.title}</p>
                          <p className="text-coffee-400 text-xs mt-0.5 truncate">{step.description}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {i > 0 && (
                            <button onClick={() => moveStep(recipe.id, recipe.steps, i, i - 1)} className="p-1 text-coffee-500 hover:text-cream">
                              <ChevronUp className="w-3 h-3" />
                            </button>
                          )}
                          {i < recipe.steps.length - 1 && (
                            <button onClick={() => moveStep(recipe.id, recipe.steps, i, i + 1)} className="p-1 text-coffee-500 hover:text-cream">
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          )}
                          <button onClick={() => openEditStep(recipe.id, step)} className="p-1 text-coffee-500 hover:text-gold-400">
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button onClick={() => deleteStep(recipe.id, step.id)} className="p-1 text-coffee-500 hover:text-red-400">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => openAddStep(recipe.id)}
                      className="w-full py-2 border border-dashed border-coffee-700 text-coffee-500 text-xs hover:border-gold-500/50 hover:text-gold-400 transition-colors flex items-center justify-center gap-1">
                      <Plus className="w-3 h-3" /> Agregar paso
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}

        {recipes.length === 0 && (
          <div className="text-center py-16 text-coffee-500">
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="text-sm">Sin recetas aún. Crea la primera.</p>
          </div>
        )}
      </div>

      {/* Recipe modal */}
      <AnimatePresence>
        {recipeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-coffee-900 border border-coffee-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-5 border-b border-coffee-800 sticky top-0 bg-coffee-900 z-10">
                <h2 className="font-serif text-lg text-cream">{recipeModal === 'add' ? 'Nueva receta' : 'Editar receta'}</h2>
                <button onClick={() => setRecipeModal(null)} className="text-coffee-400 hover:text-cream"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Título *</label>
                    <input value={recipeForm.title} onChange={(e) => setRecipeForm((f) => ({ ...f, title: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Slug *</label>
                    <input value={recipeForm.slug} onChange={(e) => setRecipeForm((f) => ({ ...f, slug: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Descripción</label>
                  <textarea value={recipeForm.description} onChange={(e) => setRecipeForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2} className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none" />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Método *</label>
                    <select value={recipeForm.method} onChange={(e) => setRecipeForm((f) => ({ ...f, method: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      {METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Dificultad</label>
                    <select value={recipeForm.difficulty} onChange={(e) => setRecipeForm((f) => ({ ...f, difficulty: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      {DIFFICULTIES.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Tiempo (min)</label>
                    <input type="number" value={recipeForm.prepTime} onChange={(e) => setRecipeForm((f) => ({ ...f, prepTime: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(['temp', 'grind', 'ratio'] as const).map((field) => (
                    <div key={field}>
                      <label className="block text-xs text-coffee-400 mb-1">{field === 'temp' ? 'Temperatura' : field === 'grind' ? 'Molienda' : 'Ratio'}</label>
                      <input value={recipeForm[field]} onChange={(e) => setRecipeForm((f) => ({ ...f, [field]: e.target.value }))}
                        className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Rendimiento</label>
                    <input value={recipeForm.yield} onChange={(e) => setRecipeForm((f) => ({ ...f, yield: e.target.value }))}
                      placeholder="ej. 1 taza 250ml"
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">Café relacionado</label>
                    <select value={recipeForm.productId} onChange={(e) => setRecipeForm((f) => ({ ...f, productId: e.target.value }))}
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500">
                      <option value="">— Ninguno (receta general) —</option>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={recipeForm.isPremium} onChange={(e) => setRecipeForm((f) => ({ ...f, isPremium: e.target.checked }))}
                      className="w-4 h-4 accent-gold-500" />
                    <span className="text-xs text-coffee-300">Premium (solo suscriptores)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={recipeForm.isPublished} onChange={(e) => setRecipeForm((f) => ({ ...f, isPublished: e.target.checked }))}
                      className="w-4 h-4 accent-gold-500" />
                    <span className="text-xs text-coffee-300">Publicada</span>
                  </label>
                </div>
                <div className="flex gap-3 pt-2 border-t border-coffee-800">
                  <button onClick={saveRecipe} disabled={savingRecipe}
                    className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors">
                    {savingRecipe ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button onClick={() => setRecipeModal(null)} className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step modal */}
      <AnimatePresence>
        {stepModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              className="bg-coffee-900 border border-coffee-700 w-full max-w-lg">
              <div className="flex items-center justify-between p-5 border-b border-coffee-800">
                <h2 className="font-serif text-lg text-cream">{stepModal.stepId ? 'Editar paso' : 'Nuevo paso'}</h2>
                <button onClick={() => setStepModal(null)} className="text-coffee-400 hover:text-cream"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Título del paso *</label>
                  <input value={stepForm.title} onChange={(e) => setStepForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="ej. Precalentar el V60"
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Instrucción detallada *</label>
                  <textarea value={stepForm.description} onChange={(e) => setStepForm((f) => ({ ...f, description: e.target.value }))}
                    rows={4} className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">URL de imagen (opcional)</label>
                    <input value={stepForm.imageUrl} onChange={(e) => setStepForm((f) => ({ ...f, imageUrl: e.target.value }))}
                      placeholder="https://..."
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                  <div>
                    <label className="block text-xs text-coffee-400 mb-1">URL de video (opcional)</label>
                    <input value={stepForm.videoUrl} onChange={(e) => setStepForm((f) => ({ ...f, videoUrl: e.target.value }))}
                      placeholder="https://youtube.com/..."
                      className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-coffee-400 mb-1">Duración estimada (segundos)</label>
                  <input type="number" value={stepForm.duration} onChange={(e) => setStepForm((f) => ({ ...f, duration: e.target.value }))}
                    className="w-full bg-coffee-800 border border-coffee-700 text-cream text-sm px-3 py-2 focus:outline-none focus:border-gold-500" />
                </div>
                <div className="flex gap-3 pt-2 border-t border-coffee-800">
                  <button onClick={saveStep} disabled={savingStep}
                    className="px-5 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 disabled:opacity-50 transition-colors">
                    {savingStep ? 'Guardando...' : 'Guardar paso'}
                  </button>
                  <button onClick={() => setStepModal(null)} className="px-5 py-2 border border-coffee-700 text-coffee-400 text-xs hover:text-cream transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
