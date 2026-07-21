import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown } from 'lucide-react';

interface CollapsibleChartProps {
  id: string;
  title: string;
  subtitle?: string;
  badge?: string;
  defaultExpanded?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleChart({
  id,
  title,
  subtitle,
  badge,
  defaultExpanded = true,
  children,
}: CollapsibleChartProps) {
  const [expanded, setExpanded] = useState(() => {
    const stored = localStorage.getItem(`chart-collapse-${id}`);
    if (stored === 'collapsed') return false;
    if (stored === 'expanded') return true;
    return defaultExpanded;
  });

  useEffect(() => {
    localStorage.setItem(`chart-collapse-${id}`, expanded ? 'expanded' : 'collapsed');
  }, [id, expanded]);

  return (
    <div className="bg-coffee-100 dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 mb-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-6 pb-0 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div>
            <h2 className="font-serif text-xl text-coffee-900 dark:text-cream">{title}</h2>
            {subtitle && (
              <p className="text-coffee-600 dark:text-coffee-400 text-xs mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {badge && (
            <span className="text-gold-500 text-xs tracking-widest uppercase">{badge}</span>
          )}
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-5 h-5 text-coffee-500" />
          </motion.div>
        </div>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-6 pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
