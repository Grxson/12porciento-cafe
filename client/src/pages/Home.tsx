import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { MapPin, Award, Leaf, ChevronDown, ArrowRight } from 'lucide-react';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import ScrollReveal from '../components/ScrollReveal';
import type { Product } from '../types';

function AnimatedCounter({ end, suffix = '' }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  useEffect(() => {
    if (!isInView) return;
    const duration = 1800;
    const steps = 60;
    const increment = end / steps;
    let current = 0;
    const timer = setInterval(() => {
      current += increment;
      if (current >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(current));
    }, duration / steps);
    return () => clearInterval(timer);
  }, [isInView, end]);

  return <span ref={ref}>{count}{suffix}</span>;
}

const pillars = [
  {
    icon: Award,
    title: 'Curaduría Experta',
    desc: 'Solo lotes con puntaje SCA superior a 84 puntos. Perfiles sensoriales limpios, complejos y excepcionales.',
  },
  {
    icon: MapPin,
    title: 'Trazabilidad Total',
    desc: 'Conoce al productor, la región, la altitud y el proceso de cada lote. Transparencia desde la finca hasta tu taza.',
  },
  {
    icon: Leaf,
    title: 'Comercio Directo',
    desc: 'Sin intermediarios. Pago justo al caficultor, frescura garantizada y relaciones de largo plazo con las fincas.',
  },
];

export default function Home() {
  const [featured, setFeatured] = useState<Product[]>([]);
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    productsApi.list({ limit: '3' }).then((r) => setFeatured(r.data));
  }, []);

  return (
    <div>
      {/* ── HERO ── */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden bg-coffee-950">
        <motion.div style={{ y }} className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1920&q=80"
            alt=""
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-coffee-950/60 via-coffee-950/20 to-coffee-950" />
        </motion.div>

        <motion.div
          style={{ opacity }}
          className="absolute text-[50vw] sm:text-[38vw] font-serif font-black text-coffee-800/40 leading-none select-none pointer-events-none"
        >
          12
        </motion.div>

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-gold-500 text-xs sm:text-sm tracking-[0.35em] uppercase mb-6"
          >
            Solo el 12% del café producido en el mundo es de especialidad
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="font-serif text-[18vw] sm:text-[12rem] font-black text-cream leading-none tracking-tight"
          >
            12%
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.8 }}
            className="font-serif italic text-2xl text-coffee-300 mb-3"
          >
            doce por ciento
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
            className="text-coffee-300 text-base sm:text-lg mb-10 max-w-lg mx-auto"
          >
            Café de especialidad mexicano. Origen único. Trazabilidad total. Directo del productor.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.2 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/tienda" className="btn-primary">Explorar Tienda</Link>
            <Link to="/suscripciones" className="btn-outline-dark">Ver Suscripciones</Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2 }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
        >
          <span className="text-coffee-500 text-xs tracking-widest uppercase">Descubre</span>
          <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
            <ChevronDown className="w-5 h-5 text-gold-500/60" />
          </motion.div>
        </motion.div>
      </section>

      {/* ── THE 12% STORY ── */}
      <section className="py-24 bg-coffee-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80"
                  alt="Café de especialidad"
                  className="w-full aspect-[4/5] object-cover"
                />
                <div className="absolute -bottom-6 -right-6 bg-gold-500 p-8 hidden sm:block">
                  <p className="font-serif text-5xl font-black text-coffee-950 leading-none">12</p>
                  <p className="text-coffee-950/70 text-xs tracking-widest uppercase mt-1">Por ciento</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <div className="gold-line mb-6" />
              <h2 className="section-title mb-6">
                El café más excepcional<br />
                <em className="text-gold-500">del mundo</em>
              </h2>
              <p className="text-coffee-200 leading-relaxed mb-6">
                De toda la producción cafetalera global, únicamente el 12% alcanza los estándares
                de la Specialty Coffee Association con puntajes superiores a 80 puntos. Nosotros
                trabajamos exclusivamente dentro de ese universo.
              </p>
              <p className="text-coffee-300 leading-relaxed mb-8">
                Cada lote que ofrecemos es seleccionado directamente en origen, catado bajo
                protocolos SCA estrictos y tostado en pequeños lotes para garantizar que llegue
                a tu taza en su punto máximo de expresión sensorial.
              </p>
              <Link to="/nosotros" className="inline-flex items-center gap-2 text-gold-500 hover:text-gold-400 transition-colors text-sm tracking-widest uppercase">
                Conoce nuestra historia <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ── TRES PILARES ── */}
      <section className="py-24 bg-coffee-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <div className="gold-line mx-auto mb-6" />
            <h2 className="section-title">Nuestra propuesta de valor</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map(({ icon: Icon, title, desc }, i) => (
              <ScrollReveal key={title} delay={i * 0.15}>
                <div className="bg-coffee-900 border border-coffee-700 hover:border-gold-500/30 transition-all duration-300 p-8 group">
                  <div className="w-12 h-12 border border-gold-500/30 flex items-center justify-center mb-6 group-hover:border-gold-500 transition-colors">
                    <Icon className="w-5 h-5 text-gold-500" />
                  </div>
                  <h3 className="font-serif text-xl text-cream mb-3">{title}</h3>
                  <p className="text-coffee-300 text-sm leading-relaxed">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS DESTACADOS ── */}
      <section className="py-24 bg-coffee-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12">
            <ScrollReveal>
              <div className="gold-line mb-4" />
              <h2 className="section-title">Selección actual</h2>
            </ScrollReveal>
            <ScrollReveal delay={0.1}>
              <Link to="/tienda" className="hidden sm:flex items-center gap-2 text-gold-400 hover:text-gold-300 transition-colors text-sm tracking-widest uppercase">
                Ver todo <ArrowRight className="w-4 h-4" />
              </Link>
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featured.map((product, i) => (
              <ProductCard key={product.id} product={product} index={i} />
            ))}
          </div>

          <div className="text-center mt-10 sm:hidden">
            <Link to="/tienda" className="btn-outline-dark">Ver toda la tienda</Link>
          </div>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ── */}
      <section className="py-20 bg-gold-500">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 84, suffix: '+', label: 'Puntos SCA mínimos' },
              { value: 6, suffix: '', label: 'Orígenes de México' },
              { value: 7, suffix: ' días', label: 'Máximo del tueste' },
              { value: 100, suffix: '%', label: 'Comercio directo' },
            ].map(({ value, suffix, label }) => (
              <div key={label}>
                <p className="font-serif text-5xl font-black text-coffee-950 leading-none">
                  <AnimatedCounter end={value} suffix={suffix} />
                </p>
                <p className="text-coffee-700 text-sm mt-2 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SUSCRIPCIÓN CTA ── */}
      <section className="py-24 bg-coffee-900 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-500/5 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gold-500/5 rounded-full blur-2xl -translate-x-1/2 translate-y-1/2" />
        </div>

        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal>
            <div className="gold-line mx-auto mb-6" />
            <h2 className="section-title mb-6">
              Café fresco, cada mes,<br />
              <em className="text-gold-500">en tu puerta</em>
            </h2>
            <p className="text-coffee-300 text-lg mb-4">
              Desde <span className="text-gold-500 font-semibold">$240 / mes</span>
            </p>
            <p className="text-coffee-400 mb-10 max-w-xl mx-auto">
              Suscríbete y recibe lotes seleccionados, tostados a pedido, con notas de
              catación e información completa de trazabilidad. Cancela cuando quieras.
            </p>
            <Link to="/suscripciones" className="btn-primary">Ver planes de suscripción</Link>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
