import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, LogOut, Package, Settings, Gift } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '../context/UserContext';

export default function UserMenu() {
  const user = useUser((s) => s.user);
  const logout = useUser((s) => s.logout);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (!user) {
    return (
      <Link
        to="/login"
        aria-label="Iniciar sesión"
        className="text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
      >
        <User className="w-5 h-5" />
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Mi cuenta"
        className="flex items-center justify-center w-8 h-8 bg-gold-500/20 border border-gold-500/40 hover:border-gold-500 text-gold-500 transition-colors"
      >
        <span className="text-xs font-bold">{user.name[0].toUpperCase()}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-coffee-900 border border-coffee-200 dark:border-coffee-800 shadow-xl z-50"
          >
            <div className="px-4 py-3 border-b border-coffee-200 dark:border-coffee-800">
              <p className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
                {user.name}
              </p>
              <p className="text-coffee-600 dark:text-coffee-400 text-xs truncate">{user.email}</p>
            </div>
            <nav className="py-1">
              {[
                { to: '/perfil/pedidos', label: 'Mis pedidos', icon: Package },
                { to: '/perfil/configuracion', label: 'Mi perfil', icon: Settings },
                { to: '/gift-card', label: 'Regalar', icon: Gift },
              ].map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-coffee-700 dark:text-coffee-300 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-100 dark:hover:bg-coffee-800/50 transition-colors"
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-coffee-200 dark:border-coffee-800 py-1">
              <button
                onClick={() => {
                  logout();
                  setOpen(false);
                  navigate('/');
                }}
                className="flex items-center gap-3 px-4 py-2.5 text-sm text-coffee-600 dark:text-coffee-400 hover:text-red-400 w-full transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
