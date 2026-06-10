import { useState, useEffect, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X, Sun, Moon } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import { useUser } from '../context/UserContext';
import UserMenu from './UserMenu';
import NotificationBell from './NotificationBell';
import CartDrawer from './CartDrawer';

const links = [
  { to: '/tienda', label: 'Tienda' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/leaderboard', label: 'Ranking' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/quiz', label: 'Quiz' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.count());
  const openDrawer = useCart((s) => s.openDrawer);
  const { dark, toggle } = useTheme();
  const user = useUser((s) => s.user);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  return (
    <>
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-coffee-950/98 backdrop-blur-sm shadow-lg shadow-coffee-950/20 border-b border-coffee-800/60'
          : 'bg-coffee-950/85 backdrop-blur-sm'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 md:h-20 flex items-center justify-between">
        <Link to="/" className="flex flex-col leading-none">
          <span className="font-serif text-2xl font-bold text-cream tracking-tight">12%</span>
          <span className="text-[9px] tracking-[0.3em] text-gold-500 uppercase">doce por ciento</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `text-sm tracking-widest uppercase transition-colors duration-200 ${
                  isActive ? 'text-gold-500' : 'text-coffee-200 hover:text-cream'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <button
            onClick={toggle}
            className="text-coffee-200 hover:text-cream transition-colors"
            aria-label="Cambiar tema"
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <UserMenu />
          {user && <NotificationBell />}
          <button
            onClick={openDrawer}
            className="relative text-coffee-200 hover:text-cream transition-colors"
            aria-label="Carrito"
          >
            <ShoppingBag className="w-5 h-5" />
            {count > 0 && (
              <motion.span
                key={count}
                initial={{ scale: 0.5 }}
                animate={{ scale: 1 }}
                className="absolute -top-2 -right-2 bg-gold-500 text-coffee-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center"
              >
                {count}
              </motion.span>
            )}
          </button>

          <button
            onClick={() => setOpen(!open)}
            className="md:hidden text-coffee-200 hover:text-cream transition-colors"
            aria-label="Menú"
          >
            <AnimatePresence mode="wait">
              {open
                ? <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}><X className="w-5 h-5" /></motion.span>
                : <motion.span key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}><Menu className="w-5 h-5" /></motion.span>
              }
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>

    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-coffee-950/70 backdrop-blur-sm md:hidden"
            onClick={() => setOpen(false)}
          />
          <motion.div
            ref={menuRef}
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-coffee-900 border-l border-coffee-800 flex flex-col pt-20 pb-8 md:hidden"
          >
            <nav className="flex flex-col px-6 gap-1">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `py-3 text-sm tracking-widest uppercase border-b border-coffee-800/50 transition-colors ${
                      isActive ? 'text-gold-500' : 'text-coffee-200 hover:text-cream'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
    <CartDrawer />
    </>
  );
}
