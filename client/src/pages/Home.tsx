import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { MapPin, Award, Leaf, ChevronDown, ArrowRight, Zap, Flame, Sprout, SunMedium, FlaskConical, Coffee, BookOpen, Play, Trophy } from 'lucide-react';
import TestimonialsSlider from '../components/TestimonialsSlider';
import { productsApi } from '../api';
import ProductCard from '../components/ProductCard';
import ScrollReveal from '../components/ScrollReveal';
import type { Product } from '../types';
import { PageMeta } from '../hooks/usePageMeta';

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
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const [featuredError, setFeaturedError] = useState('');
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%']);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  useEffect(() => {
    setFeaturedLoading(true);
    setFeaturedError('');
    productsApi.list({ limit: '3' })
      .then((r) => setFeatured(r.data.data))
      .catch(() => setFeaturedError('Error al cargar productos destacados'))
      .finally(() => setFeaturedLoading(false));
  }, []);

  return (
    <div>
      <PageMeta title="Inicio" description="Café de especialidad mexicano. Descubre notas florales y cítricas de Veracruz y Chiapas." />
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
            className="font-serif italic text-lg sm:text-2xl text-coffee-300 mb-3"
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
            <Link to="/tienda" className="btn-primary w-full sm:w-auto min-h-[48px] flex items-center justify-center">Explorar Tienda</Link>
            <Link to="/suscripciones" className="btn-outline-dark w-full sm:w-auto min-h-[48px] flex items-center justify-center">Ver Suscripciones</Link>
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

      {/* ── TRUST STRIP ── */}
      <section className="bg-coffee-100 dark:bg-coffee-900/80 border-y border-coffee-200/40 dark:border-coffee-800/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-coffee-200/40 dark:divide-coffee-800/40">
            {[
              { Icon: Zap,     label: 'Envío 24–48h',   sub: 'Express a todo México' },
              { Icon: Flame,   label: 'Tueste a pedido', sub: 'Máx. 7 días del tueste' },
              { Icon: Leaf,    label: '100% México',     sub: 'Orígenes certificados' },
              { Icon: Award,   label: 'SCA ≥ 84 pts',   sub: 'Curado bajo protocolo' },
            ].map(({ Icon, label, sub }) => (
              <div key={label} className="flex items-center gap-3 px-4 sm:px-6 py-4 md:py-5">
                <div className="w-8 h-8 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gold-500" />
                </div>
                <div>
                  <p className="text-coffee-900 dark:text-cream text-xs font-semibold tracking-wide">{label}</p>
                  <p className="text-coffee-600 dark:text-coffee-400 text-xs tracking-wide mt-0.5">{sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── THE 12% STORY ── */}
      <section className="py-16 sm:py-20 lg:py-24 bg-coffee-50 dark:bg-coffee-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="left">
              <div className="relative">
                <img
                  src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80"
                  alt="Café de especialidad"
                  className="w-full aspect-[4/5] object-cover"
                  loading="lazy"
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
              <p className="text-coffee-800 dark:text-coffee-200 leading-relaxed mb-6">
                De toda la producción cafetalera global, únicamente el 12% alcanza los estándares
                de la Specialty Coffee Association con puntajes superiores a 80 puntos. Nosotros
                trabajamos exclusivamente dentro de ese universo.
              </p>
              <p className="text-coffee-700 dark:text-coffee-300 leading-relaxed mb-8">
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
      <section className="py-16 sm:py-20 lg:py-24 bg-coffee-100 dark:bg-coffee-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <div className="gold-line mx-auto mb-6" />
            <h2 className="section-title">Nuestra propuesta de valor</h2>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pillars.map(({ icon: Icon, title, desc }, i) => (
              <ScrollReveal key={title} delay={i * 0.15}>
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-700 hover:border-gold-500/30 transition-all duration-300 p-8 group">
                  <div className="w-12 h-12 border border-gold-500/30 flex items-center justify-center mb-6 group-hover:border-gold-500 transition-colors">
                    <Icon className="w-5 h-5 text-gold-500" />
                  </div>
                  <h3 className="font-serif text-xl text-coffee-900 dark:text-cream mb-3">{title}</h3>
                  <p className="text-coffee-700 dark:text-coffee-300 text-sm leading-relaxed">{desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PROCESO DE ESPECIALIDAD ── */}
      <section className="py-20 bg-coffee-100 dark:bg-coffee-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal>
            <div className="text-center mb-14">
              <div className="gold-line mx-auto mb-4" />
              <h2 className="section-title mb-3">Del origen a tu taza</h2>
              <p className="text-coffee-600 dark:text-coffee-400 max-w-xl mx-auto text-sm leading-relaxed">
                Cada lote recorre un camino de precisión y cuidado antes de llegar a tus manos.
              </p>
            </div>
          </ScrollReveal>

          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-0">
            {/* Connecting line — desktop only */}
            <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent" />
            {/* Connecting line — mobile only (vertical, centered) */}
            <div className="md:hidden absolute top-10 bottom-10 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-transparent via-gold-500/30 to-transparent" />

            {[
              { num: '01', icon: Sprout, title: 'Origen', desc: 'Fincas seleccionadas en alturas de 1,200–1,800 msnm en Veracruz y Chiapas' },
              { num: '02', icon: SunMedium, title: 'Cosecha', desc: 'Selección manual de cerezas en su punto exacto de maduración' },
              { num: '03', icon: FlaskConical, title: 'Proceso', desc: 'Lavado, Natural o Honey según el perfil sensorial deseado para ese lote' },
              { num: '04', icon: Flame, title: 'Tueste', desc: 'Perfil de tueste único por origen, ejecutado en lotes pequeños a pedido' },
              { num: '05', icon: Coffee, title: 'Tu Taza', desc: 'Envío dentro de los 7 días del tueste para máxima frescura garantizada' },
            ].map(({ num, icon: Icon, title, desc }, i) => (
              <ScrollReveal key={num} delay={i * 0.12} direction="up" className="flex-1 w-full flex flex-col items-center text-center px-4 py-4 md:py-6 relative z-10">
                <div className="w-14 h-14 md:w-20 md:h-20 rounded-full bg-white dark:bg-coffee-800 border-2 border-gold-500/50 flex items-center justify-center mb-3 md:mb-4 transition-colors">
                  <Icon className="w-6 h-6 md:w-8 md:h-8 text-gold-400" />
                </div>
                <span className="text-xs text-gold-600 tracking-[0.3em] uppercase mb-1">{num}</span>
                <h3 className="font-serif text-lg md:text-xl text-coffee-900 dark:text-cream mb-1 md:mb-2">{title}</h3>
                <p className="text-coffee-600 dark:text-coffee-400 text-xs leading-relaxed max-w-[240px] md:max-w-[180px]">{desc}</p>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIOS ── */}
      <section className="py-16 sm:py-20 lg:py-24 bg-coffee-50 dark:bg-coffee-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="text-center mb-16">
            <div className="gold-line mx-auto mb-6" />
            <h2 className="section-title">Lo que dicen nuestros clientes</h2>
            <p className="text-coffee-700 dark:text-coffee-300 mt-4 max-w-xl mx-auto">Más de 400 suscriptores en México. Esto es lo que nos comparten.</p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Carlos M.',
                location: 'Ciudad de México',
                stars: 5,
                quote: 'La tostión del Chiapas Geisha fue reveladora. Nunca había probado notas tan claras de jazmín y durazno en una taza. Completamente diferente a lo que conocía.',
              },
              {
                name: 'Ana P.',
                location: 'Guadalajara',
                stars: 5,
                quote: 'Soy suscriptora desde el primer lote. La trazabilidad real, con nombre del productor y altitud de la finca, me hace sentir conexión genuina con el origen.',
              },
              {
                name: 'Rodrigo V.',
                location: 'Monterrey',
                stars: 5,
                quote: 'El pedido llega en 48h perfectamente empacado con las notas de catación impresas. Se nota el cuidado en cada detalle. Vale cada peso.',
              },
            ].map(({ name, location, stars, quote }, i) => (
              <ScrollReveal key={name} delay={i * 0.12}>
                <div className="bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 hover:border-gold-500/30 transition-all duration-300 p-8 flex flex-col gap-6 h-full">
                  <div className="flex gap-1">
                    {Array.from({ length: stars }).map((_, j) => (
                      <svg key={j} className="w-4 h-4 fill-gold-500 text-gold-500" viewBox="0 0 20 20" aria-hidden="true">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-coffee-800 dark:text-coffee-200 text-sm leading-relaxed italic flex-1">"{quote}"</p>
                  <div className="border-t border-coffee-200 dark:border-coffee-800 pt-4">
                    <p className="text-coffee-900 dark:text-cream text-sm font-semibold">{name}</p>
                    <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{location}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS DESTACADOS ── */}
      <section className="py-16 sm:py-20 lg:py-24 bg-coffee-50 dark:bg-coffee-950">
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

          {featuredLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-6 h-6 border-2 border-gold-500/30 border-t-gold-500 rounded-full animate-spin" />
            </div>
          ) : featuredError ? (
            <div className="text-center py-8">
              <p className="text-red-500 text-sm">{featuredError}</p>
              <button
                onClick={() => {
                  setFeaturedLoading(true);
                  setFeaturedError('');
                  productsApi.list({ limit: '3' })
                    .then((r) => setFeatured(r.data.data))
                    .catch(() => setFeaturedError('Error al cargar productos destacados'))
                    .finally(() => setFeaturedLoading(false));
                }}
                className="mt-3 text-xs text-gold-500 hover:text-gold-400 underline"
              >
                Reintentar
              </button>
            </div>
          ) : featured.length === 0 ? (
            <p className="text-center text-coffee-500 py-8">No hay productos disponibles</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.map((product, i) => (
                <ProductCard key={product.id} product={product} index={i} />
              ))}
            </div>
          )}

          <div className="text-center mt-10 sm:hidden">
            <Link to="/tienda" className="btn-outline-dark">Ver toda la tienda</Link>
          </div>
        </div>
      </section>

      {/* ── ESTADÍSTICAS ── */}
      <section className="py-20 bg-gold-500 dark:bg-gold-500/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: 84, suffix: '+', label: 'Puntos SCA mínimos' },
              { value: 6, suffix: '', label: 'Orígenes de México' },
              { value: 7, suffix: ' días', label: 'Máximo del tueste' },
              { value: 100, suffix: '%', label: 'Comercio directo' },
            ].map(({ value, suffix, label }) => (
              <div key={label}>
                <p className="font-serif text-5xl font-black text-coffee-950 dark:text-gold-300 leading-none">
                  <AnimatedCounter end={value} suffix={suffix} />
                </p>
                <p className="text-coffee-700 dark:text-gold-400/90 text-sm mt-2 uppercase tracking-widest">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RECETAS & BARISTA ── */}
      <section className="py-16 sm:py-20 bg-coffee-100 dark:bg-coffee-900 border-t border-coffee-200/40 dark:border-coffee-800/40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-gold-500 uppercase tracking-[0.3em] mb-3">Experiencia</p>
          <h2 className="section-title mb-4">Aprende con cada taza</h2>
          <p className="text-coffee-600 dark:text-coffee-400 text-base max-w-xl mx-auto mb-12">
            Guías paso a paso, modo en vivo y un sistema de niveles para convertirte en barista de especialidad.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            {[
              { icon: <BookOpen className="w-7 h-7 text-gold-500" />, title: 'Recetas guiadas', desc: 'V60, AeroPress, Espresso y más. Cada método explicado en detalle.' },
              { icon: <Play className="w-7 h-7 text-gold-500" />, title: 'Modo en vivo', desc: 'Sigue los pasos en pantalla completa con temporizadores integrados.' },
              { icon: <Trophy className="w-7 h-7 text-gold-500" />, title: 'Niveles de Barista', desc: 'Gana XP con cada brew, desbloquea logros y sube en el ranking.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="bg-coffee-50 dark:bg-coffee-950/60 border border-coffee-200 dark:border-coffee-800 p-6 text-left hover:border-gold-500/40 transition-colors">
                <div className="mb-4">{icon}</div>
                <h3 className="text-coffee-900 dark:text-cream font-serif text-lg mb-2">{title}</h3>
                <p className="text-coffee-600 dark:text-coffee-400 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
          <Link to="/recetas" className="btn-primary inline-flex items-center gap-2">
            Ver recetas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── SUSCRIPCION CTA ── */}
      <section className="relative overflow-hidden bg-coffee-50 dark:bg-coffee-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 min-h-[500px]">
            {/* Image side */}
            <div className="relative hidden lg:block">
              <img
                src="https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=80"
                alt="Café de especialidad"
                className="w-full h-full object-cover opacity-60"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-coffee-50 dark:to-coffee-950" />
            </div>
            {/* Text side */}
            <div className="flex flex-col justify-center py-14 sm:py-16 lg:py-20 lg:pl-12">
              <ScrollReveal direction="right">
                <div className="gold-line mb-6" />
                <h2 className="section-title mb-4">
                  Café fresco,<br />cada mes
                </h2>
                <p className="text-coffee-700 dark:text-coffee-300 leading-relaxed mb-6 max-w-md">
                  Suscríbete y recibe lotes seleccionados de origen único directamente en tu puerta.
                  Tostados a pedido, enviados frescos.
                </p>
                <p className="text-gold-500 text-2xl font-serif mb-8">Desde $350 / mes</p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Link to="/suscripciones" className="btn-primary w-full sm:w-auto min-h-[48px] flex items-center justify-center">Ver suscripciones</Link>
                  <Link to="/tienda" className="btn-outline-dark w-full sm:w-auto min-h-[48px] flex items-center justify-center">Explorar tienda</Link>
                </div>
              </ScrollReveal>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSlider />

      {/* ── ROASTING SCHEDULE ── */}
      <section className="py-16 px-4 bg-coffee-50 dark:bg-coffee-950 border-t border-coffee-200/40 dark:border-coffee-800/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-3">Transparencia total</p>
            <h2 className="font-serif text-3xl sm:text-4xl text-coffee-900 dark:text-cream">Calendario de Tueste</h2>
            <p className="text-coffee-600 dark:text-coffee-400 mt-3 max-w-md mx-auto">
              Tostamos por lotes pequeños, bajo pedido. Tu café llega máximo 7 días después del tueste.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(['Lunes', 'Miércoles', 'Viernes', 'Sábado'] as const).map((day, i) => {
              const roastDays = [1, 3, 5, 6];
              const isToday = roastDays[i] === new Date().getDay();
              return (
                <div
                  key={day}
                  className={`p-5 border text-center transition-all ${
                    isToday
                      ? 'border-gold-500/60 bg-gold-500/10'
                      : 'border-coffee-200 dark:border-coffee-800 bg-coffee-100/40 dark:bg-coffee-900/40'
                  }`}
                >
                  {isToday && (
                    <div className="flex items-center justify-center gap-1.5 mb-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold-500 animate-pulse" />
                      <span className="text-gold-500 text-xs tracking-widest uppercase">Hoy</span>
                    </div>
                  )}
                  <p className={`font-medium ${isToday ? 'text-coffee-900 dark:text-cream' : 'text-coffee-700 dark:text-coffee-300'}`}>{day}</p>
                  <p className="text-coffee-500 text-xs mt-1">8:00 – 14:00</p>
                </div>
              );
            })}
          </div>
          <p className="text-center text-coffee-500 dark:text-coffee-600 text-xs tracking-wider mt-6">
            Pedidos antes de las 12pm se tuestan en el próximo día programado.
          </p>
        </div>
      </section>
    </div>
  );
}
