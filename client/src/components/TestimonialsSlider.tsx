import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

const testimonials = [
  {
    name: 'Mariana R.',
    city: 'CDMX',
    rating: 5,
    text: 'El primer sorbo y entendí la diferencia. El Honey de Oaxaca tiene notas de miel y durazno que nunca había probado en un café mexicano.',
    plan: 'Suscriptora Exploradora',
  },
  {
    name: 'Carlos M.',
    city: 'Monterrey',
    rating: 5,
    text: 'Recibo mi suscripción cada mes y siempre me sorprenden. La trazabilidad es real — sé exactamente de dónde viene cada grano.',
    plan: 'Suscriptor Connoisseur',
  },
  {
    name: 'Sofía T.',
    city: 'Guadalajara',
    rating: 5,
    text: 'Empecé siendo escéptica del café de especialidad. Hoy no puedo tomar otro tipo de café. 12% me cambió el paladar.',
    plan: 'Compradora frecuente',
  },
  {
    name: 'Diego L.',
    city: 'Puebla',
    rating: 5,
    text: 'El tueste a pedido marca la diferencia. Llega fresco, fragante, y el empaque es hermoso. Gran regalo también.',
    plan: 'Suscriptor Fundador',
  },
];

export default function TestimonialsSlider() {
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);

  const prev = () => { setDir(-1); setIdx((i) => (i - 1 + testimonials.length) % testimonials.length); };
  const next = () => { setDir(1); setIdx((i) => (i + 1) % testimonials.length); };

  useEffect(() => {
    const t = setInterval(() => { setDir(1); setIdx((i) => (i + 1) % testimonials.length); }, 5000);
    return () => clearInterval(t);
  }, []);

  const t = testimonials[idx];

  return (
    <section className="bg-coffee-900/60 py-20 px-4">
      <div className="max-w-3xl mx-auto text-center">
        <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-4">Lo que dicen</p>
        <h2 className="font-serif text-4xl text-cream mb-12">Nuestros Clientes</h2>

        <div className="relative min-h-[200px]">
          <AnimatePresence custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex flex-col items-center"
            >
              <div className="flex gap-1 mb-6">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold-500 text-gold-500" />
                ))}
              </div>
              <blockquote className="font-serif italic text-xl text-coffee-200 leading-relaxed mb-6 max-w-xl">
                "{t.text}"
              </blockquote>
              <p className="text-cream font-medium text-sm">{t.name}</p>
              <p className="text-coffee-500 text-xs tracking-widest uppercase mt-1">
                {t.city} · {t.plan}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-4 mt-8">
          <button onClick={prev} className="p-2 border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-2">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => { setDir(i > idx ? 1 : -1); setIdx(i); }}
                className={`w-2 h-2 rounded-full transition-all ${i === idx ? 'bg-gold-500 scale-125' : 'bg-coffee-700'}`}
              />
            ))}
          </div>
          <button onClick={next} className="p-2 border border-coffee-700 text-coffee-400 hover:text-cream hover:border-coffee-500 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
}
