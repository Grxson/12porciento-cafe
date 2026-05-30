import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Menu, X } from 'lucide-react';
import { useCart } from '../context/CartContext';
import UserMenu from './UserMenu';

const links = [
  { to: '/tienda', label: 'Tienda' },
  { to: '/recetas', label: 'Recetas' },
  { to: '/suscripciones', label: 'Suscripciones' },
  { to: '/nosotros', label: 'Nosotros' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const count = useCart((s) => s.count());
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
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

        <div className="flex items-center gap-4">
          <UserMenu />
          <button
            onClick={() => navigate('/carrito')}
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
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-coffee-900 border-t border-coffee-800 overflow-hidden"
          >
            <nav className="flex flex-col p-6 gap-6">
              {links.map(({ to, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className={({ isActive }) =>
                    `text-base tracking-widest uppercase ${
                      isActive ? 'text-gold-500' : 'text-coffee-200'
                    }`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
