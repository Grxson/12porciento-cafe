import { NavLink, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Package, Star, CreditCard, Settings, CreditCard as CardIcon, Trophy } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { useBarista } from '../hooks/useBarista';
import Orders from './profile/Orders';
import Reviews from './profile/Reviews';
import Subscription from './profile/Subscription';
import ProfileSettings from './profile/Settings';
import PaymentMethod from './profile/PaymentMethod';

const tabs = [
  { to: '/perfil/pedidos',       label: 'Pedidos',      icon: Package },
  { to: '/perfil/resenas',       label: 'Reseñas',      icon: Star },
  { to: '/perfil/suscripcion',   label: 'Suscripción',  icon: CreditCard },
  { to: '/perfil/pago',          label: 'Método de pago', icon: CardIcon },
  { to: '/perfil/configuracion', label: 'Mi perfil',    icon: Settings },
];

export default function Profile() {
  const user = useUser((s) => s.user);
  const { profile: baristaProfile } = useBarista(user?.id);

  return (
    <div className="pt-20 min-h-screen bg-coffee-950 pb-24 md:pb-0">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full overflow-hidden bg-coffee-800 border border-coffee-800 shrink-0">
            {user?.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gold-500/20 flex items-center justify-center">
                <span className="font-serif text-2xl text-gold-500 font-bold">
                  {user?.name?.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-0.5">Bienvenido</p>
            <h1 className="font-serif text-3xl text-cream">{user?.name}</h1>
            <p className="text-coffee-400 text-sm">{user?.email}</p>
          </div>
          {baristaProfile && user && (
            <Link
              to={`/perfil/barista/${user.id}`}
              className="flex flex-col items-center gap-1 px-4 py-2 bg-gold-500/10 border border-gold-500/30 hover:border-gold-500 transition-colors shrink-0"
            >
              <Trophy className="w-4 h-4 text-gold-500" />
              <p className="text-gold-400 font-bold text-sm">Nv. {baristaProfile.level}</p>
              <p className="text-[10px] text-coffee-500">{baristaProfile.totalXp} XP</p>
            </Link>
          )}
        </div>

        <div className="flex gap-1 border-b border-coffee-800 mb-8 overflow-x-auto">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                  isActive
                    ? 'border-gold-500 text-gold-500'
                    : 'border-transparent text-coffee-400 hover:text-cream'
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </div>

        <Routes>
          <Route index element={<Navigate to="pedidos" replace />} />
          <Route path="pedidos" element={<Orders />} />
          <Route path="resenas" element={<Reviews />} />
          <Route path="suscripcion" element={<Subscription />} />
          <Route path="pago" element={<PaymentMethod />} />
          <Route path="configuracion" element={<ProfileSettings />} />
        </Routes>
      </div>
    </div>
  );
}
