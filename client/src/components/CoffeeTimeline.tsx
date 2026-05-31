import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import { MapPin, Mountain, Leaf, Calendar, Droplets, Flame, Award } from 'lucide-react';
import type { Product } from '../types';

interface TimelineNode {
  stage: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
}

function buildTimeline(product: Product): TimelineNode[] {
  const nodes: TimelineNode[] = [];
  if (product.region) nodes.push({ stage: 'Origen', value: product.region, detail: 'México — café de especialidad de origen único', icon: MapPin });
  if (product.altitude) nodes.push({
    stage: 'Altitud', value: `${product.altitude.toLocaleString()} msnm`,
    detail: product.altitude >= 1600 ? 'Alta montaña — complejidad aromática superior' : product.altitude >= 1200 ? 'Altitud media-alta' : 'Altitud media',
    icon: Mountain,
  });
  if (product.variety) nodes.push({ stage: 'Variedad', value: product.variety, detail: 'Cultivar seleccionado por su perfil sensorial', icon: Leaf });
  nodes.push({ stage: 'Cosecha', value: 'Nov – Feb', detail: 'Selección manual de cerezas en su punto óptimo', icon: Calendar });
  if (product.process) nodes.push({
    stage: 'Proceso', value: product.process,
    detail: product.process === 'Lavado' ? 'Fermentación húmeda — acidez brillante y limpia' : product.process === 'Natural' ? 'Secado con fruto — dulzura frutal intensa' : product.process === 'Honey' ? 'Mucílago parcial — dulzura balanceada' : 'Fermentación sellada — perfil experimental',
    icon: Droplets,
  });
  if (product.roastLevel) nodes.push({
    stage: 'Tueste', value: product.roastLevel,
    detail: product.roastLevel === 'Ligero' ? 'Preserva florales y acidez del terroir' : product.roastLevel === 'Medio-Ligero' ? 'Balance dulzura / complejidad aromática' : product.roastLevel === 'Medio' ? 'Cuerpo redondo, acidez integrada' : 'Cuerpo potente, notas amargas',
    icon: Flame,
  });
  if (product.scaScore) nodes.push({
    stage: 'SCA', value: `${product.scaScore} pts`,
    detail: product.scaScore >= 88 ? 'Excelente — café de alta gama' : product.scaScore >= 86 ? 'Muy bueno — especialidad superior' : 'Especialidad certificada — top 12% mundial',
    icon: Award,
  });
  return nodes;
}

function DesktopNode({ node, index }: { node: TimelineNode; index: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });

  return (
    <div ref={ref} className="flex flex-col items-center relative flex-1 min-w-0 group cursor-default">
      {/* Animated icon */}
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={isInView ? { scale: 1, opacity: 1 } : {}}
        transition={{ duration: 0.4, delay: index * 0.1 }}
        className="relative z-10 w-12 h-12 rounded-full bg-white border-2 border-coffee-200 group-hover:border-gold-500 flex items-center justify-center mb-3 transition-all duration-300 shadow-sm group-hover:shadow-md"
      >
        <node.icon className="w-5 h-5 text-coffee-400 group-hover:text-gold-500 transition-colors duration-300" />
      </motion.div>

      {/* Text */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.4, delay: index * 0.1 + 0.1 }}
        className="text-center px-1"
      >
        <p className="text-[9px] text-gold-600 uppercase tracking-[0.25em] mb-0.5">{node.stage}</p>
        <p className="font-serif text-coffee-900 text-sm leading-tight">{node.value}</p>
        <p className="text-coffee-400 text-[10px] mt-1 leading-relaxed max-h-0 overflow-hidden group-hover:max-h-20 transition-all duration-300">{node.detail}</p>
      </motion.div>
    </div>
  );
}

export default function CoffeeTimeline({ product }: { product: Product }) {
  const nodes = buildTimeline(product);
  const lineRef = useRef(null);
  const lineInView = useInView(lineRef, { once: true });

  return (
    <div className="mt-10 pt-8 border-t border-coffee-200">
      <div className="flex items-center gap-3 mb-8">
        <div className="gold-line" />
        <h3 className="font-serif text-xl text-coffee-900">Del origen a tu taza</h3>
        <span className="text-xs text-coffee-400 ml-auto hidden sm:block italic">Pasa el cursor sobre cada etapa</span>
      </div>

      {/* Mobile: vertical */}
      <div className="flex flex-col gap-0 md:hidden">
        {nodes.map((node, i) => (
          <motion.div
            key={node.stage}
            initial={{ opacity: 0, x: -12 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.35, delay: i * 0.07 }}
            className="flex gap-4 pb-5"
          >
            <div className="flex flex-col items-center shrink-0">
              <div className="w-10 h-10 rounded-full bg-white border-2 border-gold-500/50 flex items-center justify-center shadow-sm">
                <node.icon className="w-4 h-4 text-gold-500" />
              </div>
              {i < nodes.length - 1 && <div className="w-px flex-1 bg-coffee-200 mt-1 min-h-[16px]" />}
            </div>
            <div className="pt-1.5">
              <p className="text-[9px] text-gold-600 uppercase tracking-widest">{node.stage}</p>
              <p className="font-serif text-coffee-900 text-sm">{node.value}</p>
              <p className="text-coffee-500 text-xs mt-0.5 leading-relaxed">{node.detail}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Desktop: horizontal */}
      <div className="hidden md:block relative">
        {/* Connecting line behind nodes */}
        <div ref={lineRef} className="absolute top-6 left-[6%] right-[6%] overflow-hidden" style={{ height: '2px' }}>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={lineInView ? { scaleX: 1 } : {}}
            transition={{ duration: 1.0, ease: 'easeOut', delay: 0.2 }}
            className="h-full bg-gradient-to-r from-coffee-200 via-gold-500/40 to-coffee-200 origin-left"
          />
        </div>
        <div className="flex items-start gap-0">
          {nodes.map((node, i) => <DesktopNode key={node.stage} node={node} index={i} />)}
        </div>
      </div>
    </div>
  );
}
