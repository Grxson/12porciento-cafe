// client/src/components/recipes/RecipeList.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronDown, BookOpen } from 'lucide-react';
import type { Recipe, RecipeStep } from '../../types';
import StepList from './StepList';

interface RecipeListProps {
  recipes: Recipe[];
  loading: boolean;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipe: Recipe) => void;
  onAddNew: () => void;
  onAddStep: (recipeId: string) => void;
  onEditStep: (recipeId: string, step: RecipeStep) => void;
  onDeleteStep: (recipeId: string, step: RecipeStep) => void;
  onReorderStep: (recipeId: string, stepIds: string[]) => Promise<void>;
}

export default function RecipeList({ recipes, loading, onEdit, onDelete, onAddNew, onAddStep, onEditStep, onDeleteStep, onReorderStep }: RecipeListProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 bg-coffee-200 dark:bg-coffee-800/50 shimmer" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-coffee-500 dark:text-coffee-400">{recipes.length} receta{recipes.length !== 1 ? 's' : ''}</p>
        <button
          onClick={onAddNew}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase hover:bg-gold-400 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nueva receta
        </button>
      </div>

      <div className="space-y-2">
        {recipes.length === 0 ? (
          <div className="text-center py-12 text-coffee-500 dark:text-coffee-400">
            <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Sin recetas. Crea la primera.</p>
          </div>
        ) : (
          recipes.map(recipe => (
            <motion.div
              key={recipe.id}
              layout
              className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 overflow-hidden"
            >
              <div
                role="button"
                tabIndex={0}
                onClick={() => setExpanded(expanded === recipe.id ? null : recipe.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setExpanded(expanded === recipe.id ? null : recipe.id);
                  }
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-coffee-200 dark:hover:bg-coffee-800/50 transition-colors text-left cursor-pointer focus:outline-none focus:bg-coffee-200 dark:focus:bg-coffee-800/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-serif text-coffee-900 dark:text-cream truncate">{recipe.title}</h3>
                    <div className="flex gap-1 shrink-0">
                      {recipe.isPublished ? (
                        <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1">Publicada</span>
                      ) : (
                        <span className="text-[10px] bg-coffee-200 dark:bg-coffee-800 text-coffee-600 dark:text-coffee-400 px-2 py-1">Borrador</span>
                      )}
                      {recipe.isPremium && (
                        <span className="text-[10px] bg-gold-100 dark:bg-gold-900/30 text-gold-700 dark:text-gold-400 px-2 py-1">Premium</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-coffee-500 dark:text-coffee-400 mt-1">{recipe.method} • {recipe.difficulty}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
                    className="p-1.5 text-coffee-500 dark:text-coffee-400 hover:text-gold-500 dark:hover:text-gold-400 transition-colors"
                    aria-label="Editar receta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(recipe); }}
                    className="p-1.5 text-coffee-500 dark:text-coffee-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                    aria-label="Eliminar receta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <ChevronDown className={`w-4 h-4 text-coffee-500 dark:text-coffee-400 transition-transform ${expanded === recipe.id ? 'rotate-180' : ''}`} />
                </div>
              </div>

              <AnimatePresence>
                {expanded === recipe.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-coffee-200 dark:border-coffee-800 bg-coffee-200/20 dark:bg-coffee-800/20 overflow-hidden"
                  >
                    <div className="p-4 space-y-3">
                      {recipe.description && (
                        <p className="text-xs text-coffee-600 dark:text-coffee-300">{recipe.description}</p>
                      )}
                      <div className="flex flex-wrap gap-x-4 gap-y-1">
                        <p className="text-xs text-coffee-500 dark:text-coffee-400">
                          <strong>Slug:</strong> {recipe.slug}
                        </p>
                        {recipe.prepTime && (
                          <p className="text-xs text-coffee-500 dark:text-coffee-400">
                            <strong>Tiempo:</strong> {recipe.prepTime} min
                          </p>
                        )}
                        {recipe.product && (
                          <p className="text-xs text-coffee-500 dark:text-coffee-400">
                            <strong>Café:</strong> {recipe.product.name}
                          </p>
                        )}
                      </div>
                      <div>
                        <p className="text-xs text-coffee-500 dark:text-coffee-400 mb-2"><strong>Pasos ({recipe.steps.length})</strong></p>
                        <StepList
                          steps={recipe.steps}
                          onAddNew={() => onAddStep(recipe.id)}
                          onEdit={(s) => onEditStep(recipe.id, s)}
                          onDelete={(s) => onDeleteStep(recipe.id, s)}
                          onReorder={(ids) => onReorderStep(recipe.id, ids)}
                        />
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
