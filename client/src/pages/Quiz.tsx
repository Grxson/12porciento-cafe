import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Coffee, Loader2 } from 'lucide-react';
import { productsApi } from '../api';
import type { Product } from '../types';
import QuizProductCard from '../components/QuizProductCard';
import { PageMeta } from '../hooks/usePageMeta';

interface ScoredProduct {
  product: Product;
  score: number;
}

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
  const early = answers.time === 'early';
  const night = answers.time === 'night';

  if (fruity && (lightBody || pourover || night)) {
    return {
      roast: 'Ligero',
      process: 'Natural',
      label: 'El Explorador de Sabores',
      desc: 'Buscas complejidad, acidez viva y notas frutales. Un Natural o Anaeróbico de tueste ligero es tu ideal.',
      filter: '?roast=Ligero',
    };
  }
  if (answers.flavor === 'chocolate' || answers.body === 'full' || early) {
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

// Stemming: normalize flavor text for matching
function stem(word: string): string {
  return word.toLowerCase()
    .replace(/[áéíóú]/g, (c) => ({ 'á': 'a', 'é': 'e', 'í': 'i', 'ó': 'o', 'ú': 'u' })[c] ?? c)
    .replace(/[^a-z0-9]/g, '');
}

// Maps quiz flavor answer → flavor stems to match against product.flavors
const flavorStems: Record<string, string[]> = {
  chocolate: ['chocolat', 'caramel', 'cacao', 'cremoso', 'dulce'],
  fruity:    ['frut', 'floral', 'berry', 'mora', 'fresa', 'frambues', 'tropical'],
  nutty:     ['nuez', 'almendra', 'especi', 'canela', 'avellana'],
  citrus:    ['citric', 'limon', 'naranj', 'acidez', 'mandarina'],
};

// Infer body (light/medium/full) from process + roast
function inferBody(process?: string, roast?: string): 'light' | 'medium' | 'full' {
  const p = (process ?? '').toLowerCase();
  const r = (roast ?? '').toLowerCase();
  if (p.includes('natural') || p.includes('anaerob') || r.includes('oscuro')) return 'full';
  if (p.includes('honey') || r.includes('medio')) return 'medium';
  return 'light';
}

// Probabilistic scoring: each answer weights multiple product attributes
function scoreProduct(product: Product, answers: Answers): number {
  const flavorAnswer = answers.flavor ?? '';
  const bodyAnswer = answers.body ?? 'surprise';
  const timeAnswer = answers.time ?? 'mid';
  const methodAnswer = answers.method ?? 'any';

  // Roast match (25%) — time answer drives roast preference
  const roastPref: Record<string, string[]> = {
    early:     ['Medio', 'Oscuro'],
    night:     ['Ligero', 'Medio-Ligero'],
    mid:       ['Medio', 'Medio-Ligero'],
    afternoon: ['Medio-Ligero', 'Ligero'],
  };
  const preferredRoasts = roastPref[timeAnswer] ?? ['Medio', 'Medio-Ligero'];
  const roastScore = preferredRoasts.includes(product.roastLevel ?? '') ? 1 : 0.2;

  // Process match (20%) — method answer drives process preference
  const processPref: Record<string, string[]> = {
    espresso: ['Natural', 'Anaeróbico'],
    pourover: ['Lavado', 'Honey'],
    french:   ['Honey', 'Natural'],
    any:      ['Lavado', 'Natural', 'Honey', 'Anaeróbico'],
  };
  const preferredProcesses = processPref[methodAnswer] ?? ['Lavado', 'Natural'];
  const processScore = preferredProcesses.includes(product.process ?? '') ? 1 : 0.2;

  // Body match (15%) — body answer matched to inferred body
  const userBody = bodyAnswer === 'surprise' ? 'any' : bodyAnswer;
  const productBody = inferBody(product.process, product.roastLevel);
  const bodyScore = userBody === 'any' ? 0.5 : (productBody === userBody ? 1 : 0.1);

  // Flavor match (10%) — stemmed keyword hits
  const stems = flavorStems[flavorAnswer] ?? [];
  const productStems = product.flavors.map((f) => stem(f));
  const hits = stems.filter((s) => productStems.some((pf) => pf.includes(s))).length;
  const flavorScore = stems.length > 0 ? Math.min(hits / stems.length, 1) : 0.3;

  // SCA score (30%)
  const scaScore = (product.scaScore ?? 80) / 100;

  // Weighted sum (each attribute contributes proportionally)
  return roastScore * 0.25 + processScore * 0.20 + bodyScore * 0.15 + flavorScore * 0.10 + scaScore * 0.30;
}

async function fetchRecommendations(answers: Answers): Promise<ScoredProduct[]> {
  // Fetch a broad set of CAFÉ products only (no roast filter — score all against user profile)
  let products: Product[] = [];
  try {
    const res = await productsApi.list({ category: 'CAFÉ', pageSize: '30' });
    products = res.data.data;
  } catch { /* fallback below */ }

  // Broaden if too few results
  if (products.length < 6) {
    try {
      const res = await productsApi.list({ category: 'CAFÉ', pageSize: '30', page: '2' });
      products = [...products, ...res.data.data];
    } catch { /* ignore */ }
  }

  // Ultimate fallback: top SCA CAFÉ only
  if (products.length < 6) {
    try {
      const res = await productsApi.list({ category: 'CAFÉ', sort: 'sca', pageSize: '20' });
      products = res.data.data;
    } catch { /* ignore */ }
  }

  // Score each product using the probabilistic engine
  const scored = products.map((p) => ({ product: p, score: scoreProduct(p, answers) }));
  scored.sort((a, b) => b.score - a.score);

  // Diversity guarantee: max 2 products from same origin
  const originCount = new Map<string, number>();
  const diverse: ScoredProduct[] = [];
  for (const item of scored) {
    const origin = item.product.origin ?? 'Desconocido';
    if ((originCount.get(origin) ?? 0) >= 2) continue;
    originCount.set(origin, (originCount.get(origin) ?? 0) + 1);
    diverse.push(item);
    if (diverse.length >= 6) break;
  }

  return diverse;
}

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const [recommendations, setRecommendations] = useState<ScoredProduct[]>([]);
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
      <div className={`w-full ${done ? 'max-w-6xl' : 'max-w-lg'}`}>
        <div className="text-center mb-10">
          <Coffee className="w-10 h-10 text-gold-500/60 mx-auto mb-4" />
          <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-2">Coffee Quiz</p>
          <h1 className="font-serif text-4xl text-coffee-900 dark:text-cream">¿Cuál es tu roast perfecto?</h1>
        </div>

        <AnimatePresence>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 md:gap-8">
                    {recommendations.map((item) => (
                      <QuizProductCard key={item.product.id} product={item.product} matchPct={Math.round(item.score * 100)} />
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
