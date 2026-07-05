import { NavLink, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import {
  Package,
  Star,
  CreditCard,
  Settings,
  CreditCard as CardIcon,
  Trophy,
  Heart,
  Gift,
  Wrench,
  Coffee,
  ChevronLeft,
} from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useBarista } from '../hooks/useBarista';
import Orders from './profile/Orders';
import Reviews from './profile/Reviews';
import Subscription from './profile/Subscription';
import ProfileSettings from './profile/Settings';
import PaymentMethod from './profile/PaymentMethod';
import OrderDetail from './profile/OrderDetail';
import Wishlist from './profile/Wishlist';
import GiftCards from './profile/GiftCards';
import Equipment from './profile/Equipment';
import CoffeeTracker from './profile/CoffeeTracker';
import { PageMeta } from '../hooks/usePageMeta';

interface NavItem {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navGroups: { title: string; items: NavItem[] }[] = [
  {
    title: 'Pedidos',
    items: [
      { to: '/perfil/pedidos', label: 'Pedidos', icon: Package },
      { to: '/perfil/gift-cards', label: 'Gift Cards', icon: Gift },
    ],
  },
  {
    title: 'Perfil',
    items: [
      { to: '/perfil/configuracion', label: 'Mi perfil', icon: Settings },
      { to: '/perfil/resenas', label: 'Reseñas', icon: Star },
    ],
  },
  {
    title: 'Barista',
    items: [
      { to: '/perfil/equipo', label: 'Equipo', icon: Wrench },
      { to: '/perfil/cafes', label: 'Cafés', icon: Coffee },
    ],
  },
  {
    title: 'Cuenta',
    items: [
      { to: '/perfil/suscripcion', label: 'Suscripción', icon: CreditCard },
      { to: '/perfil/pago', label: 'Método de pago', icon: CardIcon },
      { to: '/perfil/lista-deseos', label: 'Lista de Deseos', icon: Heart },
    ],
  },
];

// flat list for active-route lookup
const allNavItems = navGroups.flatMap((g) => g.items);

export default function Profile() {
  const user = useUser((s) => s.user);
  const { profile: baristaProfile } = useBarista(user?.id);
  const location = useLocation();
  const isRoot = location.pathname === '/perfil' || location.pathname === '/perfil/';

  // Find current section label for breadcrumb
  const currentItem = allNavItems.find(
    (item) => item.to === location.pathname || location.pathname.startsWith(item.to + '/'),
  );

  return (
    <div className="pt-20 min-h-screen bg-coffee-50 dark:bg-coffee-950 pb-24 md:pb-0">
      <PageMeta title={currentItem ? `${currentItem.label} · Mi Perfil` : 'Mi Perfil'} />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        {/* ── Header ── */}
        <div className="relative mb-10">
          {/* Banner con imagen o gradiente */}
          {baristaProfile && baristaProfile.bannerUrl ? (
            <div
              className="h-32 md:h-48 -mx-4 sm:-mx-6 lg:-mx-8 mb-0 bg-cover bg-center"
              style={{ backgroundImage: `url(${baristaProfile.bannerUrl})` }}
            >
              <div className="w-full h-full bg-gradient-to-t from-coffee-950/60 via-transparent to-coffee-950/20" />
            </div>
          ) : (
            <div className="h-32 md:h-48 -mx-4 sm:-mx-6 lg:-mx-8 mb-0 bg-gradient-to-r from-coffee-900 via-coffee-800 to-gold-900/30" />
          )}

          <div className="flex items-end gap-5 -mt-14 md:-mt-20 relative z-10 px-4 sm:px-0">
            {/* Avatar */}
            <div className="w-20 h-20 md:w-28 md:h-28 rounded-full overflow-hidden bg-coffee-200 dark:bg-coffee-800 border-4 border-coffee-50 dark:border-coffee-950 shrink-0 shadow-lg">
              {user?.avatarUrl ? (
                <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gold-500/20 flex items-center justify-center">
                  <span className="font-serif text-3xl md:text-5xl text-gold-500 font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 pb-1 md:pb-2">
              <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-0.5">Bienvenido</p>
              <h1 className="font-serif text-2xl md:text-3xl text-coffee-900 dark:text-cream truncate">
                {user?.name}
              </h1>
              <p className="text-coffee-600 dark:text-coffee-400 text-sm truncate">{user?.email}</p>
            </div>

            {/* Barista badge */}
            {user && (
              <Link
                to={`/perfil/barista/${user.id}`}
                className="flex flex-col items-center gap-1 px-4 py-2.5 bg-gold-500/10 border border-gold-500/30 hover:border-gold-500 transition-colors shrink-0 rounded-lg"
              >
                <Trophy className="w-5 h-5 text-gold-500" />
                {baristaProfile ? (
                  <>
                    <p className="text-gold-400 font-bold text-sm">Nv. {baristaProfile.level}</p>
                    <p className="text-xs text-coffee-500">{baristaProfile.totalXp} XP</p>
                  </>
                ) : (
                  <p className="text-xs text-coffee-500 text-center leading-tight">Barista</p>
                )}
              </Link>
            )}
          </div>
        </div>

        {/* ── Breadcrumb / Back ── */}
        {currentItem && (
          <div className="flex items-center gap-2 mb-6">
            <Link
              to="/perfil"
              className="flex items-center gap-1 text-sm text-coffee-500 hover:text-gold-500 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Perfil
            </Link>
            <span className="text-coffee-400 dark:text-coffee-600">/</span>
            <span className="text-sm text-coffee-900 dark:text-cream font-medium">
              {currentItem.label}
            </span>
          </div>
        )}

        {/* ── Navigation Grid (only on root or when sub-page is active, show compact) ── */}
        {!currentItem || isRoot ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-10">
            {navGroups.map((group) => (
              <div key={group.title} className="col-span-2 md:col-span-1">
                <h3 className="text-xs text-coffee-500 uppercase tracking-[0.2em] mb-3 md:mb-4">
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.items.map(({ to, label, icon: Icon }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                          isActive
                            ? 'border-gold-500 bg-gold-500/10 text-gold-500'
                            : 'border-coffee-200 dark:border-coffee-800 bg-white dark:bg-coffee-900 text-coffee-700 dark:text-coffee-300 hover:border-gold-500/50 hover:text-coffee-900 dark:hover:text-cream'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 shrink-0" />
                      <span className="text-sm font-medium">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {/* ── Content ── */}
        {isRoot ? (
          <div className="text-center py-16">
            <p className="text-coffee-500 dark:text-coffee-400 text-sm">
              Selecciona una sección para gestionar tu cuenta
            </p>
          </div>
        ) : (
          <Routes>
            <Route path="pedidos" element={<Orders />} />
            <Route path="pedidos/:id" element={<OrderDetail />} />
            <Route path="resenas" element={<Reviews />} />
            <Route path="lista-deseos" element={<Wishlist />} />
            <Route path="suscripcion" element={<Subscription />} />
            <Route path="pago" element={<PaymentMethod />} />
            <Route path="configuracion" element={<ProfileSettings />} />
            <Route path="gift-cards" element={<GiftCards />} />
            <Route path="equipo" element={<Equipment />} />
            <Route path="cafes" element={<CoffeeTracker />} />
          </Routes>
        )}
      </div>
    </div>
  );
}
