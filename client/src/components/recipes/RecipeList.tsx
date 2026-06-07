// client/src/components/recipes/RecipeList.tsx
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, ChevronDown, BookOpen } from 'lucide-react';
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
                    aria-label="Editar receta"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDelete(recipe); }}
                    className="p-1.5 text-coffee-500 hover:text-red-400 transition-colors"
                    aria-label="Eliminar receta"
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
