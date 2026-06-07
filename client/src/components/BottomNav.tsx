import { NavLink, useLocation } from 'react-router-dom';
import { Store, BookOpen, ShoppingBag, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const tabs = [
  { to: '/tienda', label: 'Tienda', icon: Store },
  { to: '/recetas', label: 'Recetas', icon: BookOpen },
  { to: '/carrito', label: 'Carrito', icon: ShoppingBag, badge: true },
  { to: '/perfil', label: 'Perfil', icon: User },
];

export default function BottomNav() {
  const count = useCart((s) => s.count());
  const user = useUser((s) => s.user);
  const { pathname } = useLocation();

  const resolveTo = (to: string) => (to === '/perfil' && !user ? '/login' : to);

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-coffee-950/95 backdrop-blur-sm border-t border-coffee-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const target = resolveTo(to);
          const active = pathname === to || pathname.startsWith(to + '/');
          return (
            <NavLink
              key={to}
              to={target}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] tracking-wide transition-colors ${
                active ? 'text-gold-500' : 'text-coffee-400'
              }`}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {badge && count > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-gold-500 text-coffee-950 text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center">
                    {count}
                  </span>
                )}
              </span>
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
