import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';

const origins = [
  { region: 'Coatepec, Veracruz', altitude: '1,200–1,600 msnm', notes: 'Notas achocolatadas, frutos amarillos, acidez cítrica balanceada.' },
  { region: 'Huatusco, Veracruz', altitude: '1,000–1,400 msnm', notes: 'Cuerpo cremoso, frutos rojos intensos, caramelo.' },
  { region: 'Jaltenango, Chiapas', altitude: '1,400–1,700 msnm', notes: 'Dulzura tropical, cuerpo medio, florales elegantes.' },
  { region: 'Soconusco, Chiapas', altitude: '1,500–1,800 msnm', notes: 'Alta complejidad, variedades exóticas, acidez brillante.' },
];

const values = [
  { title: 'Calidad ante todo', body: 'Trabajamos solo con lotes que superan los 84 puntos SCA. Sin excepciones.' },
  { title: 'Pago justo', body: 'Pagamos entre un 30-60% más que el precio de mercado a los productores con quienes trabajamos.' },
  { title: 'Frescura garantizada', body: 'Tostamos a pedido. Tu café llega dentro de los primeros 7 días del tueste.' },
  { title: 'Transparencia total', body: 'Conoces al productor, la finca, la altitud y el proceso de cada lote que compras.' },
];

export default function About() {
  return (
    <div className="pt-20 min-h-screen">
      {/* Hero — stays dark with imagery */}
      <section className="bg-coffee-950 relative min-h-[65vh] flex items-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1920&q=80"
            alt="Café farm"
            className="w-full h-full object-cover opacity-25"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-coffee-950/40 via-coffee-950/20 to-coffee-950" />
        </div>
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
            <div className="w-12 h-[2px] bg-gold-500 mb-6" />
            <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl text-cream mb-6 leading-tight">
              Nosotros
            </h1>
            <p className="text-coffee-200 text-lg sm:text-xl leading-relaxed max-w-2xl">
              Somos un proyecto nacido de la obsesión por el café de especialidad mexicano.
              Creemos que la mejor taza del mundo puede venir de nuestro propio país.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission — light bg */}
      <section className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal>
              <div className="gold-line mb-6" />
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-coffee-900 leading-tight mb-6">
                ¿Por qué <em className="text-gold-600">12%</em>?
              </h2>
              <p className="text-coffee-700 leading-relaxed mb-5">
                El 12% no es un número arbitrario. Es la fracción del café producido en el mundo que
                alcanza los estándares de especialidad definidos por la Specialty Coffee Association.
              </p>
              <p className="text-coffee-600 leading-relaxed mb-5">
                En ese 12% existe una riqueza sensorial extraordinaria: geishas florales de Chiapas,
                naturales frutales de Veracruz, honey procesados con notas tropicales. Cafés que
                cuentan una historia, una geografía, el trabajo de una familia.
              </p>
              <p className="text-coffee-600 leading-relaxed">
                Nuestra misión es hacer ese 12% accesible, educando al consumidor y construyendo
                relaciones directas y justas con los productores mexicanos que hacen posible esa magia.
              </p>
            </ScrollReveal>

            <ScrollReveal delay={0.2} direction="right">
              <div className="grid grid-cols-2 gap-4">
                <img
                  src="https://images.unsplash.com/photo-1580933073521-dc49ac0d4e6a?auto=format&fit=crop&w=600&q=80"
                  alt="Pour over"
                  className="w-full aspect-[3/4] object-cover"
                  loading="lazy"
                />
                <img
                  src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=600&q=80"
                  alt="Coffee cup"
                  className="w-full aspect-[3/4] object-cover mt-8"
                  loading="lazy"
                />
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Values — dark accent section */}
      <section className="py-12 sm:py-24 bg-coffee-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-14">
            <div className="gold-line mb-5" />
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-cream leading-tight">Nuestros valores</h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {values.map(({ title, body }, i) => (
              <ScrollReveal key={title} delay={i * 0.1}>
                <div className="bg-coffee-800 border border-coffee-700 hover:border-gold-500/40 transition-all duration-300 p-8 cursor-default">
                  <div className="gold-line mb-5" />
                  <h3 className="font-serif text-xl text-cream mb-3">{title}</h3>
                  <p className="text-coffee-300 text-sm leading-relaxed">{body}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Origins — light bg */}
      <section id="origenes" className="py-12 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-14">
            <div className="gold-line mb-5" />
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-coffee-900 leading-tight">Nuestros orígenes</h2>
            <p className="text-coffee-600 mt-4 max-w-xl">
              Trabajamos con zonas cafetaleras de México con denominación de origen e identidad climática única.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {origins.map(({ region, altitude, notes }, i) => (
              <ScrollReveal key={region} delay={i * 0.1}>
                <div className="card-light p-6 flex gap-5 border-l-2 border-gold-500/30 pl-5 hover:border-gold-500/60 transition-colors">
                  <div className="w-10 h-10 border border-gold-500/40 flex items-center justify-center shrink-0 mt-1">
                    <MapPin className="w-4 h-4 text-gold-500" />
                  </div>
                  <div>
                    <h4 className="font-serif text-lg text-coffee-900 mb-1">{region}</h4>
                    <p className="text-gold-600 text-xs uppercase tracking-widest mb-2">{altitude}</p>
                    <p className="text-coffee-600 text-sm">{notes}</p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark section */}
      <section className="py-20 bg-coffee-900 border-t border-coffee-800">
        <div className="max-w-xl mx-auto px-4 text-center">
          <ScrollReveal>
            <h2 className="font-serif text-3xl text-cream mb-4">¿Listo para probar el 12%?</h2>
            <p className="text-coffee-300 mb-8">Explora nuestros lotes actuales o suscríbete para recibirlos cada mes.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/tienda" className="btn-primary">Visitar tienda</Link>
              <Link to="/suscripciones" className="btn-outline-dark">Ver suscripciones</Link>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </div>
  );
}
