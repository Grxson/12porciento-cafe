import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MonitorCheck } from 'lucide-react';
import { FocusTrap } from '@12porciento/ui';
import { GAME_SYSTEM_REQUIREMENTS } from '../constants/game';

interface GameRequirementsModalProps {
  open: boolean;
  onClose: () => void;
}

function RequirementsList({ title, rows }: { title: string; rows: Record<string, string> }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-gold-500 mb-3">{title}</p>
      <dl className="space-y-2">
        {Object.entries(rows).map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between gap-4 border-b border-coffee-800/60 pb-2 text-sm"
          >
            <dt className="capitalize text-coffee-400">{label}</dt>
            <dd className="text-right text-cream">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function GameRequirementsModal({ open, onClose }: GameRequirementsModalProps) {
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[300] flex items-center justify-center bg-coffee-950/85 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <FocusTrap active={open}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 12 }}
              transition={{ duration: 0.18 }}
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="game-requirements-title"
              className="w-full max-w-lg bg-coffee-900 border border-coffee-800 p-6 sm:p-8 max-h-[85dvh] overflow-y-auto"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)' }}
            >
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <MonitorCheck className="w-5 h-5 text-gold-500 shrink-0" />
                  <h3 id="game-requirements-title" className="font-serif text-xl text-cream">
                    Requisitos del sistema
                  </h3>
                </div>
                <button
                  onClick={onClose}
                  aria-label="Cerrar requisitos"
                  className="flex min-h-11 min-w-11 items-center justify-center text-coffee-400 hover:text-cream transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <RequirementsList title="Mínimos" rows={GAME_SYSTEM_REQUIREMENTS.minimos} />
                <RequirementsList
                  title="Recomendados"
                  rows={GAME_SYSTEM_REQUIREMENTS.recomendados}
                />
              </div>

              <p className="mt-6 text-xs text-coffee-500 leading-relaxed">
                Requisitos preliminares sujetos a cambio antes del lanzamiento final.
              </p>
            </motion.div>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
