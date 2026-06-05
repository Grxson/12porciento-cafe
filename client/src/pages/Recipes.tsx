import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Coffee, GlassWater, Snowflake, Wrench, Lock, Star,
  Clock, ChevronDown, ChevronUp, Download, Play,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { recipesApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe } from '../types';

function MethodIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m.includes('espresso') || m.includes('americano')) return <Coffee className="w-4 h-4" />;
  if (m.includes('cold') || m.includes('frío')) return <Snowflake className="w-4 h-4" />;
  if (m.includes('moka') || m.includes('presión')) return <Wrench className="w-4 h-4" />;
  return <GlassWater className="w-4 h-4" />;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  'FÁCIL': 'text-green-400 bg-green-900/20 border-green-500/30',
  'MEDIA': 'text-yellow-400 bg-yellow-900/20 border-yellow-500/30',
  'DIFÍCIL': 'text-red-400 bg-red-900/20 border-red-500/30',
};

function downloadRecipePDF(recipe: Recipe) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 8, 6);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('12%', 10, 17);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('CAFÉ DE ESPECIALIDAD', 10, 24);

  doc.setTextColor(13, 8, 6);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(recipe.title, 10, 42);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 80, 60);
  let metaY = 50;
  if (recipe.temp) { doc.text(`Temperatura: ${recipe.temp}`, 10, metaY); metaY += 6; }
  if (recipe.grind) { doc.text(`Molienda: ${recipe.grind}`, 10, metaY); metaY += 6; }
  if (recipe.ratio) { doc.text(`Ratio: ${recipe.ratio}`, 10, metaY); metaY += 6; }
  if (recipe.prepTime) { doc.text(`Tiempo: ${recipe.prepTime} min`, 10, metaY); metaY += 6; }

  doc.setDrawColor(201, 169, 110);
  doc.setLineWidth(0.3);
  doc.line(10, metaY + 2, W - 10, metaY + 2);
  metaY += 8;

  doc.setTextColor(13, 8, 6);
  recipe.steps.forEach((step, i) => {
    if (metaY > 185) { doc.addPage(); metaY = 15; }
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. ${step.title}`, 10, metaY);
    metaY += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const lines = doc.splitTextToSize(step.description, W - 20);
    doc.text(lines, 10, metaY);
    metaY += lines.length * 4.5 + 4;
  });

  doc.setFontSize(7);
  doc.setTextColor(150, 120, 90);
  doc.text('12porciento.cafe', 10, doc.internal.pageSize.getHeight() - 8);

  doc.save(`${recipe.slug}.pdf`);
}

export default function Recipes() {
  const hasSubscription = useUser((s) => s.hasSubscription);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [methodFilter, setMethodFilter] = useState<string>('TODOS');

  useEffect(() => {
    recipesApi.list().then((r) => {
      setRecipes(r.data.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const methods = ['TODOS', ...Array.from(new Set(recipes.map((r) => r.method))).sort()];
  const filtered = methodFilter === 'TODOS' ? recipes : recipes.filter((r) => r.method === methodFilter);

  const visible = hasSubscription
    ? filtered
    : (() => {
        const free = filtered.filter((r) => !r.isPremium);
        const premium = filtered.filter((r) => r.isPremium);
        return [...free.slice(0, 2), ...premium];
      })();

  const freeLimit = !hasSubscription && filtered.filter((r) => !r.isPremium).length > 2;

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-coffee-950 py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Guías de preparación</p>
          <h1 className="font-serif text-4xl text-cream mb-4">Recetas</h1>
          <p className="text-coffee-400 text-sm max-w-lg mx-auto">
            Desde espressos clásicos hasta métodos de filtrado de especialidad. Cada receta, paso a paso.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap justify-center mb-10">
          {methods.map((m) => (
            <button
              key={m}
              onClick={() => setMethodFilter(m)}
              className={`px-4 py-1.5 text-xs uppercase tracking-wider border transition-colors ${
                methodFilter === m
                  ? 'border-gold-500 text-gold-500 bg-gold-500/10'
                  : 'border-coffee-700 text-coffee-400 hover:border-coffee-600'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          {visible.map((recipe) => {
            const isLocked = recipe.isPremium && !hasSubscription;
            const isExpanded = expandedId === recipe.id;

            return (
              <motion.div
                key={recipe.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`border ${isLocked ? 'border-gold-500/20 bg-coffee-900/40' : 'border-coffee-800 bg-coffee-900'}`}
              >
                <div
                  className="flex items-center justify-between p-5 cursor-pointer"
                  onClick={() => !isLocked && setExpandedId(isExpanded ? null : recipe.id)}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-gold-400"><MethodIcon method={recipe.method} /></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-cream font-medium">{recipe.title}</h3>
                        {recipe.isPremium && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-gold-500/10 border border-gold-500/30 text-gold-400 uppercase tracking-wider">
                            Premium
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-coffee-500">{recipe.method}</span>
                        {recipe.prepTime && (
                          <span className="flex items-center gap-1 text-xs text-coffee-500">
                            <Clock className="w-3 h-3" /> {recipe.prepTime} min
                          </span>
                        )}
                        {recipe.difficulty && (
                          <span className={`text-[10px] px-1.5 py-0.5 border rounded-sm ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}>
                            {recipe.difficulty}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isLocked && (
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadRecipePDF(recipe); }}
                        className="p-1.5 text-coffee-500 hover:text-gold-400 transition-colors"
                        title="Descargar PDF"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    {isLocked ? (
                      <Lock className="w-4 h-4 text-gold-500/50" />
                    ) : (
                      isExpanded ? <ChevronUp className="w-4 h-4 text-coffee-400" /> : <ChevronDown className="w-4 h-4 text-coffee-400" />
                    )}
                  </div>
                </div>

                {isLocked && (
                  <div className="px-5 pb-5">
                    <div className="flex items-center gap-3 bg-gold-500/5 border border-gold-500/20 p-4">
                      <Star className="w-5 h-5 text-gold-500 shrink-0" />
                      <div>
                        <p className="text-cream text-sm font-medium">Receta exclusiva para suscriptores</p>
                        <p className="text-coffee-400 text-xs mt-0.5">Suscríbete para acceder a todas las recetas premium y más.</p>
                      </div>
                      <Link to="/suscripciones" className="ml-auto shrink-0 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors">
                        Ver planes
                      </Link>
                    </div>
                    {recipe.steps[0] && (
                      <div className="mt-3 px-2 opacity-50">
                        <p className="text-xs text-coffee-400 uppercase tracking-wider mb-1">Paso 1 (vista previa)</p>
                        <p className="text-coffee-300 text-sm">{recipe.steps[0].description}</p>
                      </div>
                    )}
                  </div>
                )}

                <AnimatePresence>
                  {isExpanded && !isLocked && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden border-t border-coffee-800"
                    >
                      <div className="p-5 space-y-6">
                        {(recipe.temp || recipe.grind || recipe.ratio || recipe.yield) && (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {[
                              { label: 'Temperatura', value: recipe.temp },
                              { label: 'Molienda', value: recipe.grind },
                              { label: 'Ratio', value: recipe.ratio },
                              { label: 'Rendimiento', value: recipe.yield },
                            ].filter((x) => x.value).map((x) => (
                              <div key={x.label} className="bg-coffee-800/50 p-3 text-center">
                                <p className="text-[10px] text-coffee-500 uppercase tracking-wider mb-1">{x.label}</p>
                                <p className="text-cream text-sm font-medium">{x.value}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="space-y-5">
                          {recipe.steps.map((step, i) => (
                            <div key={step.id} className="flex gap-4">
                              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                                <span className="text-gold-400 text-xs font-bold">{i + 1}</span>
                              </div>
                              <div className="flex-1">
                                <p className="text-cream font-medium mb-1">{step.title}</p>
                                <p className="text-coffee-300 text-sm leading-relaxed">{step.description}</p>
                                {step.duration && (
                                  <p className="text-xs text-coffee-500 mt-1 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {step.duration}s
                                  </p>
                                )}
                                {step.imageUrl && (
                                  <img src={step.imageUrl} alt={step.title} className="mt-3 rounded-lg max-h-64 object-cover" />
                                )}
                                {step.videoUrl && (
                                  <a href={step.videoUrl} target="_blank" rel="noopener noreferrer"
                                    className="mt-3 flex items-center gap-2 text-xs text-gold-400 hover:text-gold-300 transition-colors">
                                    <Play className="w-3.5 h-3.5" /> Ver video del paso
                                  </a>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {recipe.product && (
                          <div className="border-t border-coffee-800 pt-4">
                            <p className="text-xs text-coffee-500 mb-2">Recomendado con:</p>
                            <Link to={`/tienda/${recipe.product.slug}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                              <img src={recipe.product.imageUrl} alt={recipe.product.name} className="w-10 h-10 object-cover" />
                              <span className="text-gold-400 text-sm">{recipe.product.name}</span>
                            </Link>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {freeLimit && (
          <div className="mt-8 text-center border border-gold-500/20 bg-gold-500/5 p-6">
            <Lock className="w-8 h-8 text-gold-500 mx-auto mb-3" />
            <p className="text-cream font-medium mb-1">Estás viendo 2 de {filtered.filter((r) => !r.isPremium).length} recetas gratuitas</p>
            <p className="text-coffee-400 text-sm mb-4">Suscríbete para ver todas las recetas + acceso a recetas premium exclusivas</p>
            <Link to="/suscripciones" className="inline-block px-6 py-3 bg-gold-500 text-coffee-950 text-xs font-bold uppercase tracking-wider hover:bg-gold-400 transition-colors">
              Ver planes de suscripción
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
