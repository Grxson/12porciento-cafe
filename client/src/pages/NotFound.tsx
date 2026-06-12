import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Coffee } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex flex-col items-center justify-center px-4 text-center">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <Coffee className="w-16 h-16 text-gold-500/40 mx-auto mb-6" />
        <p className="text-gold-500 text-xs tracking-[0.35em] uppercase mb-4">Error 404</p>
        <h1 className="font-serif text-7xl sm:text-9xl font-black text-coffee-900 dark:text-cream leading-none mb-4">
          Oops
        </h1>
        <p className="font-serif italic text-2xl text-coffee-700 dark:text-coffee-300 mb-3">esta página no existe</p>
        <p className="text-coffee-600 dark:text-coffee-400 text-base mb-10 max-w-md mx-auto">
          Parece que este grano se perdió en el proceso. Regresa a la tienda para encontrar tu café perfecto.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to="/" className="btn-primary">Ir al inicio</Link>
          <Link to="/tienda" className="btn-outline">Ver la tienda</Link>
        </div>
      </motion.div>
    </div>
  );
}
