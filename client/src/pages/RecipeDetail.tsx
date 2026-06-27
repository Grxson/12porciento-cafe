import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Coffee, GlassWater, Snowflake, Wrench, Lock, Star,
  Clock, Download, Play, ChevronLeft,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { recipesApi } from '../api';
import { useUser } from '../context/UserContext';
import type { Recipe } from '../types';
import RecipeLiveMode from '../components/recipes/RecipeLiveMode';
import AttemptsList from '../components/recipes/AttemptsList';
import { PageMeta } from '../hooks/usePageMeta';

function getVideoEmbed(url: string): { type: 'youtube' | 'vimeo' | 'native' | 'link'; src: string } {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/);
  if (yt) return { type: 'youtube', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(\d+)/);
  if (vm) return { type: 'vimeo', src: `https://player.vimeo.com/video/${vm[1]}` };
  if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: 'native', src: url };
  return { type: 'link', src: url };
}

function StepVideoPlayer({ url }: { url: string }) {
  const embed = getVideoEmbed(url);
  if (embed.type === 'youtube' || embed.type === 'vimeo') {
    return (
      <div className="mt-3 aspect-video w-full rounded-lg overflow-hidden bg-coffee-100 dark:bg-coffee-900">
        <iframe
          src={embed.src}
          className="w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Video del paso"
        />
      </div>
    );
  }
  if (embed.type === 'native') {
    return (
      <video
        src={embed.src}
        controls
        className="mt-3 w-full rounded-lg bg-coffee-100 dark:bg-coffee-900"
      />
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="mt-3 flex items-center gap-2 text-xs text-gold-600 dark:text-gold-400 hover:text-gold-700 dark:hover:text-gold-300 transition-colors">
      <Play className="w-3.5 h-3.5" /> Ver video
    </a>
  );
}

function MethodIcon({ method }: { method: string }) {
  const m = method.toLowerCase();
  if (m.includes('espresso') || m.includes('americano')) return <Coffee className="w-4 h-4" />;
  if (m.includes('cold') || m.includes('frío')) return <Snowflake className="w-4 h-4" />;
  if (m.includes('moka') || m.includes('presión')) return <Wrench className="w-4 h-4" />;
  return <GlassWater className="w-4 h-4" />;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  'FÁCIL': 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20 border-green-400 dark:border-green-500/30',
  'MEDIA': 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/20 border-yellow-400 dark:border-yellow-500/30',
  'DIFÍCIL': 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/20 border-red-400 dark:border-red-500/30',
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

export default function RecipeDetail() {
  const { slug } = useParams<{ slug: string }>();
  const hasSubscription = useUser((s) => s.hasSubscription);
  const user = useUser((s) => s.user);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [liveRecipeId, setLiveRecipeId] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    setError(null);
    recipesApi.list().then((r) => {
      const found = r.data.data.find((rec) => rec.slug === slug);
      if (found) {
        setRecipe(found);
      } else {
        setError('Receta no encontrada.');
      }
      setLoading(false);
    }).catch(() => {
      setError('No se pudo cargar la receta.');
      setLoading(false);
    });
  }, [slug]);

  if (error) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
        <PageMeta title="Receta no encontrada" />
        <div className="text-center max-w-md">
          <p className="text-red-600 dark:text-red-400 text-sm mb-4">{error}</p>
          <Link
            to="/recetas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a recetas
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
        <PageMeta title="Receta" />
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 space-y-3">
            <div className="shimmer dark:shimmer-dark h-3 w-32 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-9 w-48 mx-auto" />
            <div className="shimmer dark:shimmer-dark h-4 w-64 mx-auto" />
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 p-6 space-y-3">
                <div className="shimmer dark:shimmer-dark h-7 w-2/3" />
                <div className="shimmer dark:shimmer-dark h-4 w-full" />
                <div className="shimmer dark:shimmer-dark h-4 w-4/5" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!recipe) {
    return (
      <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex items-center justify-center px-4">
        <PageMeta title="Receta no encontrada" />
        <div className="text-center max-w-md">
          <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-4">Receta no encontrada.</p>
          <Link
            to="/recetas"
            className="inline-flex items-center gap-2 px-4 py-2 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Volver a recetas
          </Link>
        </div>
      </div>
    );
  }

  const isLocked = recipe.isPremium && !hasSubscription;

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 py-16 px-4">
      <PageMeta
        title={recipe.title}
        description={recipe.description || `Aprende a preparar ${recipe.title} paso a paso.`}
      />
      <div className="max-w-4xl mx-auto">
        <Link
          to="/recetas"
          className="inline-flex items-center gap-2 text-coffee-600 dark:text-coffee-400 hover:text-gold-600 dark:hover:text-gold-400 transition-colors mb-8 text-xs uppercase tracking-wider font-medium"
        >
          <ChevronLeft className="w-4 h-4" /> Volver a recetas
        </Link>

        <div className="mb-10">
          <div className="flex items-start gap-4 mb-4">
            <div className="text-gold-600 dark:text-gold-400">
              <MethodIcon method={recipe.method} />
            </div>
            <div className="flex-1">
              <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream mb-2">{recipe.title}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-sm text-coffee-600 dark:text-coffee-400">{recipe.method}</span>
                {recipe.prepTime && (
                  <span className="flex items-center gap-1 text-sm text-coffee-600 dark:text-coffee-400">
                    <Clock className="w-4 h-4" /> {recipe.prepTime} min
                  </span>
                )}
                {recipe.difficulty && (
                  <span className={`text-xs px-2 py-1 border rounded-sm ${DIFFICULTY_COLORS[recipe.difficulty] ?? ''}`}>
                    {recipe.difficulty}
                  </span>
                )}
                {recipe.isPremium && (
                  <span className="text-xs px-2 py-1 bg-gold-500/10 border border-gold-500/30 text-gold-600 dark:text-gold-400 uppercase tracking-wider">
                    Premium
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isLocked && (
                <>
                  <button
                    onClick={() => setLiveRecipeId(recipe.id)}
                    className="p-2 text-coffee-600 dark:text-coffee-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors"
                    title="Modo en vivo"
                  >
                    <Play className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => downloadRecipePDF(recipe)}
                    className="p-2 text-coffee-600 dark:text-coffee-400 hover:text-gold-700 dark:hover:text-gold-400 transition-colors"
                    title="Descargar PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>

          {recipe.description && (
            <p className="text-coffee-600 dark:text-coffee-400 text-base leading-relaxed">{recipe.description}</p>
          )}
        </div>

        {isLocked ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-gold-500/20 bg-gold-500/5 p-8 text-center"
          >
            <Lock className="w-12 h-12 text-gold-500 mx-auto mb-4" />
            <p className="text-coffee-900 dark:text-cream font-serif text-2xl mb-2">Receta exclusiva</p>
            <p className="text-coffee-600 dark:text-coffee-400 text-sm mb-6 max-w-lg mx-auto">
              Esta receta está disponible solo para suscriptores. Suscríbete a 12% para acceder a todas las recetas premium y más contenido exclusivo.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                to="/suscripciones"
                className="px-6 py-3 bg-gold-500 text-coffee-950 text-xs font-semibold uppercase tracking-wider hover:bg-gold-400 transition-colors"
              >
                Ver planes de suscripción
              </Link>
              <Link
                to="/recetas"
                className="px-6 py-3 border border-coffee-300 dark:border-coffee-700 text-coffee-900 dark:text-cream text-xs font-semibold uppercase tracking-wider hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-colors"
              >
                Ver otras recetas
              </Link>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {(recipe.temp || recipe.grind || recipe.ratio || recipe.yield) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Temperatura', value: recipe.temp },
                  { label: 'Molienda', value: recipe.grind },
                  { label: 'Ratio', value: recipe.ratio },
                  { label: 'Rendimiento', value: recipe.yield },
                ].filter((x) => x.value).map((x) => (
                  <div key={x.label} className="bg-coffee-100 dark:bg-coffee-800/50 p-4 text-center">
                    <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-1">{x.label}</p>
                    <p className="text-coffee-900 dark:text-cream text-sm font-medium">{x.value}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-6">
              <h2 className="font-serif text-2xl text-coffee-900 dark:text-cream">Pasos</h2>
              <div className="space-y-5">
                {recipe.steps.map((step, i) => (
                  <div key={step.id} className="flex gap-4 pb-5 border-b border-coffee-200 dark:border-coffee-800 last:border-0 last:pb-0">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
                      <span className="text-gold-600 dark:text-gold-400 text-sm font-bold">{i + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-coffee-900 dark:text-cream font-medium mb-2">{step.title}</p>
                      <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed mb-3">{step.description}</p>
                      {step.duration && (
                        <p className="text-xs text-coffee-600 dark:text-coffee-400 flex items-center gap-1 mb-3">
                          <Clock className="w-3 h-3" /> {step.duration}s
                        </p>
                      )}
                      {step.imageUrl && (
                        <img src={step.imageUrl} alt={step.title} className="rounded-lg w-full max-h-96 object-cover mb-3" />
                      )}
                      {step.videoUrl && (
                        <StepVideoPlayer url={step.videoUrl} />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {recipe.product && (
              <div className="border-t border-coffee-200 dark:border-coffee-800 pt-6">
                <p className="text-xs text-coffee-600 dark:text-coffee-400 uppercase tracking-wider mb-3">Recomendado con:</p>
                <Link to={`/tienda/${recipe.product.slug}`} className="flex items-center gap-4 hover:opacity-80 transition-opacity">
                  <img src={recipe.product.imageUrl} alt={recipe.product.name} className="w-16 h-16 object-cover rounded" />
                  <div>
                    <p className="text-gold-600 dark:text-gold-400 font-medium">{recipe.product.name}</p>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">Ver en tienda →</p>
                  </div>
                </Link>
              </div>
            )}

            {user && (
              <div className="border-t border-coffee-200 dark:border-coffee-800 pt-6">
                <AttemptsList recipeId={recipe.id} userId={user.id} />
              </div>
            )}
          </motion.div>
        )}

        {liveRecipeId && (
          <RecipeLiveMode
            recipe={recipe}
            onClose={() => setLiveRecipeId(null)}
          />
        )}
      </div>
    </div>
  );
}
