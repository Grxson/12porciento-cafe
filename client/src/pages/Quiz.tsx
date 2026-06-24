import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Coffee, Loader2 } from 'lucide-react';
import { productsApi } from '../api';
import type { Product } from '../types';
import ProductCard from '../components/ProductCard';
import { PageMeta } from '../hooks/usePageMeta';

interface Question {
  id: string;
  question: string;
  options: { label: string; value: string; emoji: string }[];
}

const questions: Question[] = [
  {
    id: 'time',
    question: '¿A qué hora tomas tu primer café?',
    options: [
      { label: 'Al despertar, urgente', value: 'early', emoji: '🌅' },
      { label: 'A media mañana', value: 'mid', emoji: '☀️' },
      { label: 'Después de comer', value: 'afternoon', emoji: '🌤️' },
      { label: 'En la noche, para disfrutar', value: 'night', emoji: '🌙' },
    ],
  },
  {
    id: 'flavor',
    question: '¿Qué sabores te gustan más en un café?',
    options: [
      { label: 'Chocolate y caramelo', value: 'chocolate', emoji: '🍫' },
      { label: 'Frutas y flores', value: 'fruity', emoji: '🍓' },
      { label: 'Nueces y especias', value: 'nutty', emoji: '🌰' },
      { label: 'Cítricos y acidez viva', value: 'citrus', emoji: '🍋' },
    ],
  },
  {
    id: 'body',
    question: '¿Qué cuerpo prefieres en tu taza?',
    options: [
      { label: 'Ligero, como té', value: 'light', emoji: '🍵' },
      { label: 'Equilibrado, redondo', value: 'medium', emoji: '⚖️' },
      { label: 'Denso y aterciopelado', value: 'full', emoji: '🫗' },
      { label: 'No sé, ¡sorpréndeme!', value: 'surprise', emoji: '✨' },
    ],
  },
  {
    id: 'method',
    question: '¿Cómo preparas tu café?',
    options: [
      { label: 'Espresso / cafetera', value: 'espresso', emoji: '☕' },
      { label: 'Pour over / V60', value: 'pourover', emoji: '🫖' },
      { label: 'Prensa francesa', value: 'french', emoji: '🏺' },
      { label: 'Lo que haya', value: 'any', emoji: '🤷' },
    ],
  },
];

type Answers = Record<string, string>;

function getResult(answers: Answers): { roast: string; process: string; label: string; desc: string; filter: string } {
  const fruity = answers.flavor === 'fruity' || answers.flavor === 'citrus';
  const lightBody = answers.body === 'light';
  const pourover = answers.method === 'pourover';

  if (fruity && (lightBody || pourover)) {
    return {
      roast: 'Ligero',
      process: 'Natural',
      label: 'El Explorador de Sabores',
      desc: 'Buscas complejidad, acidez viva y notas frutales. Un Natural o Anaeróbico de tueste ligero es tu ideal.',
      filter: '?roast=Ligero',
    };
  }
  if (answers.flavor === 'chocolate' || answers.body === 'full') {
    return {
      roast: 'Medio',
      process: 'Lavado',
      label: 'El Clásico Intenso',
      desc: 'Prefieres chocolates, caramelo y un cuerpo redondo. Un Lavado de tueste medio te dará equilibrio perfecto.',
      filter: '?roast=Medio',
    };
  }
  return {
    roast: 'Medio-Ligero',
    process: 'Honey',
    label: 'El Equilibrista',
    desc: 'Disfrutas lo mejor de dos mundos: dulzura natural con acidez controlada. Un Honey process es tuyo.',
    filter: '?roast=Medio-Ligero',
  };
}

// Maps quiz flavor answer → keywords to look for in product.flavors
const flavorKeywords: Record<string, string[]> = {
  chocolate: ['chocolate', 'caramelo', 'cacao'],
  fruity:    ['fruta', 'frutal', 'floral', 'berry'],
  nutty:     ['nuez', 'almendra', 'especia'],
  citrus:    ['cítrico', 'limón', 'naranja', 'acidez'],
};

function scoreProducts(products: Product[], flavorAnswer: string): Product[] {
  const keywords = flavorKeywords[flavorAnswer] ?? [];
  const scored = products.map((p) => {
    const flavorsLower = p.flavors.map((f) => f.toLowerCase());
    const hits = keywords.filter((k) => flavorsLower.some((f) => f.includes(k))).length;
    return { product: p, score: hits + (p.scaScore ?? 0) / 100 };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.product);
}

async function fetchRecommendations(answers: Answers): Promise<Product[]> {
  const result = getResult(answers);

  // Primary fetch: roast + pageSize 12
  const primary = await productsApi.list({ roast: result.roast, pageSize: '12' });
  let products = primary.data.data;

  // Broaden if fewer than 3 results
  if (products.length < 3) {
    const broad = await productsApi.list({ pageSize: '12' });
    products = broad.data.data;
  }

  // Final fallback: top SCA
  if (products.length < 3) {
    const fallback = await productsApi.list({ sort: 'sca', pageSize: '6' });
    products = fallback.data.data;
  }

  // Rank by flavor affinity + SCA score, cap at 6
  const ranked = scoreProducts(products, answers.flavor ?? '');
  return ranked.slice(0, 6);
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const [recsError, setRecsError] = useState(false);
  const navigate = useNavigate();

  const q = questions[step];
  const result = done ? getResult(answers) : null;

  // Fetch recommendations exactly once when quiz completes
  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    setRecsLoading(true);
    setRecsError(false);
    setRecommendations([]);

    fetchRecommendations(answers)
      .then((products) => {
        if (!cancelled) setRecommendations(products);
      })
      .catch(() => {
        if (!cancelled) setRecsError(true);
      })
      .finally(() => {
        if (!cancelled) setRecsLoading(false);
      });

    return () => { cancelled = true; };
  }, [done]); // eslint-disable-line react-hooks/exhaustive-deps

  const answer = (value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  const resetQuiz = () => {
    setStep(0);
    setAnswers({});
    setDone(false);
    setRecommendations([]);
    setRecsLoading(false);
    setRecsError(false);
  };

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex flex-col items-center px-4 pt-20 pb-20">
      <PageMeta title="Encuentra tu Café" description="Descubre qué café de especialidad se adapta mejor a tu paladar." />
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Coffee className="w-10 h-10 text-gold-500/60 mx-auto mb-4" />
          <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-2">Coffee Quiz</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream">¿Cuál es tu roast perfecto?</h1>
        </div>

        <AnimatePresence mode="wait">
          {!done ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-coffee-600 dark:text-coffee-500 text-xs tracking-widest uppercase">
                  {step + 1} / {questions.length}
                </span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-8 transition-all duration-300 ${i <= step ? 'bg-gold-500' : 'bg-coffee-200 dark:bg-coffee-800'}`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-coffee-900 dark:text-cream text-xl mb-6">{q.question}</h2>

              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => answer(opt.value)}
                    className="flex flex-col items-center gap-2 p-4 sm:p-5 min-h-[80px] border border-coffee-200 dark:border-coffee-700 hover:border-gold-500 hover:bg-coffee-100 dark:hover:bg-coffee-800 transition-all duration-200 text-center group bg-white dark:bg-coffee-900"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-coffee-800 dark:text-coffee-200 text-sm group-hover:text-coffee-900 dark:group-hover:text-cream transition-colors">{opt.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 text-coffee-500 hover:text-coffee-700 dark:hover:text-coffee-300 text-sm mt-6 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Anterior
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="result"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              {/* Profile card */}
              <div className="border border-gold-500/30 bg-white dark:bg-coffee-900/60 p-8 mb-6 text-center">
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Tu perfil</p>
                <h2 className="font-serif text-3xl text-coffee-900 dark:text-cream mb-2">{result!.label}</h2>
                <p className="text-coffee-700 dark:text-coffee-300 mb-4">{result!.desc}</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-coffee-100 dark:bg-coffee-800 text-coffee-800 dark:text-coffee-200">Tueste: {result!.roast}</span>
                  <span className="px-3 py-1 bg-coffee-100 dark:bg-coffee-800 text-coffee-800 dark:text-coffee-200">Proceso: {result!.process}</span>
                </div>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
                <button
                  onClick={() => navigate(`/tienda${result!.filter}`)}
                  className="btn-primary flex items-center gap-2"
                >
                  Ver mis cafés <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={resetQuiz} className="btn-outline-dark">
                  Repetir quiz
                </button>
              </div>

              {/* Recommendations section */}
              <div className="mt-2">
                <div className="mb-6 text-center">
                  <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-1">Para ti</p>
                  <h3 className="font-serif text-2xl text-coffee-900 dark:text-cream">Tus cafés recomendados</h3>
                </div>

                {recsLoading && (
                  <div className="flex flex-col items-center gap-3 py-12 text-coffee-400">
                    <Loader2 className="w-7 h-7 animate-spin text-gold-500/60" />
                    <span className="text-sm tracking-wide">Buscando los mejores cafés para ti…</span>
                  </div>
                )}

                {!recsLoading && recsError && (
                  <div className="border border-coffee-200 dark:border-coffee-700 bg-coffee-100 dark:bg-coffee-900/40 p-6 text-center text-coffee-600 dark:text-coffee-400 text-sm">
                    No pudimos cargar las recomendaciones. Usa el botón de arriba para explorar la tienda.
                  </div>
                )}

                {!recsLoading && !recsError && recommendations.length === 0 && (
                  <div className="border border-coffee-200 dark:border-coffee-700 bg-coffee-100 dark:bg-coffee-900/40 p-6 text-center text-coffee-600 dark:text-coffee-400 text-sm">
                    No encontramos cafés disponibles en este momento.{' '}
                    <button
                      onClick={() => navigate(`/tienda${result!.filter}`)}
                      className="text-gold-500 hover:text-gold-400 transition-colors underline underline-offset-2"
                    >
                      Ver tienda completa
                    </button>
                  </div>
                )}

                {!recsLoading && !recsError && recommendations.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                    {recommendations.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
