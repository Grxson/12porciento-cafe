import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Coffee } from 'lucide-react';

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

export default function Quiz() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [done, setDone] = useState(false);
  const navigate = useNavigate();

  const q = questions[step];
  const result = done ? getResult(answers) : null;

  const answer = (value: string) => {
    const next = { ...answers, [q.id]: value };
    setAnswers(next);
    if (step < questions.length - 1) {
      setStep(step + 1);
    } else {
      setDone(true);
    }
  };

  return (
    <div className="min-h-screen bg-coffee-950 flex items-center justify-center px-4 pt-20">
      <div className="w-full max-w-lg">
        <div className="text-center mb-10">
          <Coffee className="w-10 h-10 text-gold-500/60 mx-auto mb-4" />
          <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-2">Coffee Quiz</p>
          <h1 className="font-serif text-4xl text-cream">¿Cuál es tu roast perfecto?</h1>
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
                <span className="text-coffee-500 text-xs tracking-widest uppercase">
                  {step + 1} / {questions.length}
                </span>
                <div className="flex gap-1">
                  {questions.map((_, i) => (
                    <div
                      key={i}
                      className={`h-1 w-8 transition-all duration-300 ${i <= step ? 'bg-gold-500' : 'bg-coffee-800'}`}
                    />
                  ))}
                </div>
              </div>

              <h2 className="text-cream text-xl mb-6">{q.question}</h2>

              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => answer(opt.value)}
                    className="flex flex-col items-center gap-2 p-5 border border-coffee-700 hover:border-gold-500 hover:bg-coffee-800/40 transition-all duration-200 text-center group"
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-coffee-200 text-sm group-hover:text-cream transition-colors">{opt.label}</span>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex items-center gap-2 text-coffee-500 hover:text-coffee-300 text-sm mt-6 transition-colors"
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
              className="text-center"
            >
              <div className="border border-gold-500/30 bg-coffee-900/60 p-8 mb-6">
                <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-3">Tu perfil</p>
                <h2 className="font-serif text-3xl text-cream mb-2">{result!.label}</h2>
                <p className="text-coffee-300 mb-4">{result!.desc}</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="px-3 py-1 bg-coffee-800 text-coffee-200">Tueste: {result!.roast}</span>
                  <span className="px-3 py-1 bg-coffee-800 text-coffee-200">Proceso: {result!.process}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => navigate(`/tienda${result!.filter}`)}
                  className="btn-primary flex items-center gap-2"
                >
                  Ver mis cafés <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => { setStep(0); setAnswers({}); setDone(false); }}
                  className="btn-outline-dark"
                >
                  Repetir quiz
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
