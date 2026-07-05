import { NavLink, useLocation } from 'react-router-dom';
import { Store, Package, ShoppingBag, Building2, User, BookOpen, Heart } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useUser } from '../context/UserContext';

const tabs = [
  { to: '/tienda', label: 'Tienda', icon: Store },
  { to: '/recetas', label: 'Recetas', icon: BookOpen },
  { to: '/paquetes', label: 'Paquetes', icon: Package },
  { to: '/carrito', label: 'Carrito', icon: ShoppingBag, badge: true },
  { to: '/b2b', label: 'Empresas', icon: Building2 },
  { to: '/perfil', label: 'Perfil', icon: User },
  { to: '/perfil/lista-deseos', label: 'Deseos', icon: Heart },
];

export default function BottomNav() {
  const count = useCart((s) => s.count());
  const user = useUser((s) => s.user);
  const { pathname } = useLocation();

  const gatedRoutes = ['/perfil', '/perfil/lista-deseos'];
  const resolveTo = (to: string) => (gatedRoutes.includes(to) && !user ? '/login' : to);

  return (
    <nav
      aria-label="Navegación móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-coffee-950/95 backdrop-blur-sm border-t border-coffee-200 dark:border-coffee-800"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid grid-cols-7 overflow-hidden">
        {tabs.map(({ to, label, icon: Icon, badge }) => {
          const target = resolveTo(to);
          const active = pathname === to || pathname.startsWith(to + '/');
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
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2 min-h-[48px] text-xs tracking-wide transition-colors ${
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
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
