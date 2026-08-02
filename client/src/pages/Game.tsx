import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Download,
  Gamepad2,
  Coffee,
  Bug,
  Wind,
  Percent,
  MonitorCheck,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { PageMeta } from '../hooks/usePageMeta';
import MediaFrame from '../components/ui/MediaFrame';
import GalleryLightbox from '../components/GalleryLightbox';
import GameRequirementsModal from '../components/GameRequirementsModal';
import {
  GAME_NAME,
  GAME_DESCRIPTION,
  GAME_DOWNLOAD_URL,
  GAME_PLATFORM,
  GAME_META,
  GAME_IMAGES,
} from '../constants/game';

const FEATURES = [
  {
    icon: Coffee,
    title: 'Recolecta',
    desc: 'Controla tu taza y atrapa los granos de café en caída libre para sumar puntos de extracción.',
    image: GAME_IMAGES.features.recolecta,
  },
  {
    icon: Bug,
    title: 'Esquiva',
    desc: 'Cada mosca que toques te resta una vida: mantente alerta y aléjate de ellas.',
    image: GAME_IMAGES.features.esquiva,
  },
  {
    icon: Wind,
    title: 'Domina el viento',
    desc: 'En el segundo nivel, corrientes de viento desvían tu taza y suben la dificultad.',
    image: GAME_IMAGES.features.viento,
  },
  {
    icon: Percent,
    title: 'Alcanza el 12%',
    desc: 'Precisión sobre velocidad: solo una extracción perfecta del 12% te corona campeón.',
    image: GAME_IMAGES.features.extraccion,
  },
] as const;

const fadeUp = (reduce: boolean | null) => ({
  initial: reduce ? {} : { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6, ease: 'easeOut' as const },
});

export default function Game() {
  const reduceMotion = useReducedMotion();
  const [downloading, setDownloading] = useState(false);
  const [requirementsOpen, setRequirementsOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const handleDownload = () => {
    if (downloading) return;
    setDownloading(true);
    // Placeholder installer — real build not published yet. Swap
    // GAME_DOWNLOAD_URL in constants/game.ts once it exists.
    window.setTimeout(() => {
      window.location.href = GAME_DOWNLOAD_URL;
      setDownloading(false);
    }, 900);
  };

  return (
    <div className="min-h-dvh bg-coffee-50 dark:bg-coffee-950">
      <PageMeta title={GAME_NAME} description={GAME_DESCRIPTION} image={GAME_IMAGES.heroArt} />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden bg-coffee-950 text-cream">
        <div className="absolute inset-0">
          <img
            src={GAME_IMAGES.heroArt}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-coffee-950 via-coffee-950/80 to-coffee-950/40" />
          <div className="absolute inset-0 bg-gradient-to-r from-coffee-950/90 via-coffee-950/30 to-transparent" />
          <div className="bg-noise absolute inset-0" />
        </div>

        <div className="relative content-width py-28 pt-[calc(var(--app-header-height)+var(--app-safe-top)+3rem)] md:py-36">
          <motion.div
            initial={reduceMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-2xl"
          >
            <span className="inline-flex items-center gap-2 border border-ember-500/40 bg-ember-500/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-ember-400">
              <Gamepad2 className="h-3.5 w-3.5" />
              Descarga gratuita · Ya disponible
            </span>

            <h1 className="mt-6 font-serif text-5xl leading-[1.05] sm:text-6xl md:text-7xl">
              <span className="text-gradient-gold">{GAME_NAME}</span>
            </h1>

            <p className="mt-6 text-lg text-coffee-200 sm:text-xl">
              Controla tu taza y atrapa los granos perfectos: un juego de habilidad hecho en Unity
              donde cada partida te acerca —o aleja— del{' '}
              <span className="text-cream">12% de extracción perfecta</span>.
            </p>

            <p className="mt-3 max-w-xl text-sm text-coffee-400">
              El videojuego oficial de 12% Café: esquiva moscas, domina el viento y demuestra que
              tienes el toque justo.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={handleDownload}
                disabled={downloading}
                aria-busy={downloading}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-ember-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-coffee-950 transition-all duration-200 hover:bg-ember-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? 'Preparando descarga…' : 'Descargar para Windows'}
              </button>
              <a href="#presentacion" className="btn-outline-dark">
                Ver características
              </a>
            </div>

            <p className="mt-6 text-xs uppercase tracking-widest text-coffee-500">
              {GAME_PLATFORM}
            </p>
          </motion.div>
        </div>

        <a
          href="#presentacion"
          aria-label="Desplázate a la siguiente sección"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 text-coffee-400 transition-colors hover:text-cream md:flex"
        >
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </a>
      </section>

      {/* ── Presentación ── */}
      <section id="presentacion" className="content-width py-20 md:py-28">
        <div className="grid gap-12 md:grid-cols-2 md:items-center md:gap-16">
          <motion.div {...fadeUp(reduceMotion)}>
            <MediaFrame
              src={GAME_IMAGES.presentation}
              alt={`Escena de ${GAME_NAME}: recolección de granos de café`}
              ratio="product"
              className="border border-coffee-200 dark:border-coffee-800"
            />
          </motion.div>

          <motion.div {...fadeUp(reduceMotion)} transition={{ duration: 0.6, delay: 0.1 }}>
            <div className="gold-line mb-4" />
            <h2 className="section-title mb-5">¿Qué es {GAME_NAME}?</h2>
            <p className="prose-coffee dark:text-coffee-300 mb-4">{GAME_DESCRIPTION}</p>
            <p className="prose-coffee dark:text-coffee-300 mb-8">
              Cada partida pone a prueba tus reflejos: cuantos más granos perfectos recolectes, más
              cerca estarás del 12% que solo los mejores alcanzan.
            </p>

            <dl className="grid grid-cols-2 gap-6 border-t border-coffee-200 pt-6 dark:border-coffee-800">
              <div>
                <dt className="text-xs uppercase tracking-widest text-coffee-500 dark:text-coffee-500">
                  Género
                </dt>
                <dd className="mt-1 text-sm text-coffee-900 dark:text-cream">{GAME_META.genero}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-coffee-500 dark:text-coffee-500">
                  Duración
                </dt>
                <dd className="mt-1 text-sm text-coffee-900 dark:text-cream">
                  {GAME_META.duracion}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-coffee-500 dark:text-coffee-500">
                  Modo de juego
                </dt>
                <dd className="mt-1 text-sm text-coffee-900 dark:text-cream">{GAME_META.modo}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-widest text-coffee-500 dark:text-coffee-500">
                  Plataforma
                </dt>
                <dd className="mt-1 text-sm text-coffee-900 dark:text-cream">
                  {GAME_META.plataforma}
                </dd>
              </div>
            </dl>
          </motion.div>
        </div>
      </section>

      {/* ── Características ── */}
      <section id="caracteristicas" className="bg-coffee-100 py-20 dark:bg-coffee-900 md:py-28">
        <div className="content-width">
          <motion.div {...fadeUp(reduceMotion)} className="mb-12 max-w-xl">
            <div className="gold-line mb-4" />
            <h2 className="section-title mb-4">Así se juega</h2>
            <p className="prose-coffee dark:text-coffee-300">
              Cuatro elementos definen cada partida de {GAME_NAME}: recolección, obstáculos, viento
              y precisión.
            </p>
          </motion.div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, desc, image }, i) => (
              <motion.div
                key={title}
                {...fadeUp(reduceMotion)}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="group card-light dark:card-dark overflow-hidden bg-white dark:bg-coffee-800"
              >
                <MediaFrame
                  src={image}
                  alt={`Ilustración de la mecánica ${title}`}
                  ratio="recipe"
                  className="transition-transform duration-500 group-hover:scale-105"
                />
                <div className="p-5">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center border border-ember-500/40 bg-ember-500/10 text-ember-500 transition-colors group-hover:border-ember-500">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mb-1.5 font-serif text-lg text-coffee-900 dark:text-cream">
                    {title}
                  </h3>
                  <p className="text-sm leading-relaxed text-coffee-600 dark:text-coffee-400">
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Galería ── */}
      <section className="content-width py-20 md:py-28">
        <motion.div {...fadeUp(reduceMotion)} className="mb-12 max-w-xl">
          <div className="gold-line mb-4" />
          <h2 className="section-title mb-4">Capturas del mundo</h2>
          <p className="prose-coffee dark:text-coffee-300">
            Vistazo al arte y las escenas de {GAME_NAME}. Estas imágenes son de referencia y se
            sustituirán por screenshots reales del gameplay.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 sm:auto-rows-[160px] md:auto-rows-[200px]">
          {GAME_IMAGES.screenshots.map((src, i) => (
            <motion.button
              key={src}
              {...fadeUp(reduceMotion)}
              transition={{ duration: 0.5, delay: i * 0.06 }}
              onClick={() => setLightboxIndex(i)}
              aria-label={`Ampliar captura ${i + 1} de ${GAME_NAME}`}
              className={`group relative min-h-11 overflow-hidden border border-coffee-200 dark:border-coffee-800 ${
                i === 0
                  ? 'col-span-2 row-span-2'
                  : i === 3
                    ? 'col-span-2 sm:col-span-1'
                    : 'col-span-1'
              }`}
            >
              <img
                src={src}
                alt={`Captura ${i + 1} de ${GAME_NAME}`}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-coffee-950/0 transition-colors duration-300 group-hover:bg-coffee-950/30" />
            </motion.button>
          ))}
        </div>
      </section>

      {lightboxIndex !== null && (
        <GalleryLightbox
          images={GAME_IMAGES.screenshots.map((url, i) => ({
            url,
            alt: `Captura ${i + 1} de ${GAME_NAME}`,
            productName: GAME_NAME,
          }))}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* ── Descarga ── */}
      <section
        id="descarga"
        className="relative overflow-hidden bg-coffee-950 py-20 text-cream md:py-28"
      >
        <div className="bg-noise absolute inset-0" />
        <div className="content-width relative grid gap-10 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="gold-line mb-4" />
            <h2 className="font-serif text-4xl text-cream md:text-5xl">Descarga el juego</h2>
            <p className="mt-4 max-w-md text-coffee-300">
              Instala {GAME_NAME} en tu PC y comienza tu aventura por el universo 12% Café.
            </p>

            <div className="mt-8 flex flex-wrap gap-2">
              <span className="sca-badge">Windows 10 / 11</span>
              <span className="sca-badge">64 bits</span>
              <span className="sca-badge">Instalador del juego</span>
              <span className="sca-badge">Descarga gratuita</span>
            </div>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
              <button
                onClick={handleDownload}
                disabled={downloading}
                aria-busy={downloading}
                className="inline-flex min-h-12 items-center justify-center gap-2 bg-ember-500 px-8 py-3.5 text-sm font-semibold uppercase tracking-[0.15em] text-coffee-950 transition-all duration-200 hover:bg-ember-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {downloading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}
                {downloading ? 'Preparando descarga…' : 'Descargar para Windows'}
              </button>

              <button
                onClick={() => setRequirementsOpen(true)}
                className="inline-flex min-h-12 items-center justify-center gap-2 text-sm text-coffee-300 underline decoration-coffee-600 underline-offset-4 transition-colors hover:text-cream"
              >
                <MonitorCheck className="h-4 w-4" />
                Ver requisitos del sistema
              </button>
            </div>

            <p className="mt-4 text-xs text-coffee-500">
              Revisa los requisitos del sistema antes de instalar.
            </p>
          </div>

          <motion.div {...fadeUp(reduceMotion)} className="hidden md:block">
            <MediaFrame
              src={GAME_IMAGES.features.extraccion}
              alt={`Arte de ${GAME_NAME}: la taza alcanzando el 12% de extracción`}
              ratio="product"
              className="border border-coffee-800"
            />
          </motion.div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="content-width py-24 text-center md:py-32">
        <motion.div {...fadeUp(reduceMotion)} className="mx-auto max-w-2xl">
          <p className="mb-4 font-serif text-2xl italic text-coffee-500 dark:text-coffee-400 sm:text-3xl">
            &ldquo;Solo el 12% llega hasta aquí. ¿Te atreves a descubrirlo?&rdquo;
          </p>
          <h2 className="section-title mb-8">Descarga {GAME_NAME} y comienza a jugar</h2>
          <button
            onClick={handleDownload}
            disabled={downloading}
            aria-busy={downloading}
            className="btn-primary inline-flex items-center gap-2 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {downloading ? 'Preparando descarga…' : 'Descargar para Windows'}
          </button>
        </motion.div>
      </section>

      <GameRequirementsModal open={requirementsOpen} onClose={() => setRequirementsOpen(false)} />
    </div>
  );
}
