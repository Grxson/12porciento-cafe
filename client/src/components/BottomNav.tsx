import { NavLink, useLocation } from 'react-router-dom';
import { Store, ShoppingBag, User, BookOpen, Users } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const tabs = [
  { to: '/tienda', label: 'Tienda', icon: Store },
  { to: '/recetas', label: 'Recetas', icon: BookOpen },
  { to: '/carrito', label: 'Carrito', icon: ShoppingBag, badge: true },
  { to: '/feed', label: 'Comunidad', icon: Users, gated: true },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function BottomNav() {
  const count = useCart((s) => s.count());
  const user = useUser((s) => s.user);
  const { pathname } = useLocation();

  const resolveTo = (to: string, gated?: boolean) => (gated && !user ? '/login' : to);

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-coffee-950/95 backdrop-blur-sm border-t border-coffee-200 dark:border-coffee-800"
      style={{ paddingBottom: 'var(--app-safe-bottom)' }}
    >
      <div
        className="grid grid-cols-5"
        style={{ paddingLeft: 'var(--app-safe-left)', paddingRight: 'var(--app-safe-right)' }}
      >
        {tabs.map(({ to, label, icon: Icon, badge, gated }) => {
          const target = resolveTo(to, gated);
          const active = pathname === to || (to !== '/carrito' && pathname.startsWith(to + '/'));
          const isCart = badge;
          return (
            <NavLink
              key={to}
              to={target}
              aria-label={
                isCart
                  ? count > 0
                    ? `Carrito, ${count} producto${count !== 1 ? 's' : ''}`
                    : 'Carrito'
                  : undefined
              }
              className={`relative flex min-h-14 min-w-0 flex-col items-center justify-center gap-0.5 px-1 text-[11px] tracking-wide transition-colors ${
                active ? 'text-gold-500' : 'text-coffee-500 dark:text-coffee-400'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gold-500 text-coffee-950 text-xs font-bold rounded-full w-4 h-4 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate">{label}</span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
