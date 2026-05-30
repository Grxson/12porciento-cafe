import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import { Package, Star, CreditCard, Settings } from 'lucide-react';
import { useUser } from '../context/UserContext';
import Orders from './profile/Orders';
import Reviews from './profile/Reviews';
import Subscription from './profile/Subscription';
import ProfileSettings from './profile/Settings';

const tabs = [
  { to: '/perfil/pedidos',       label: 'Pedidos',      icon: Package },
  { to: '/perfil/resenas',       label: 'Reseñas',      icon: Star },
  { to: '/perfil/suscripcion',   label: 'Suscripción',  icon: CreditCard },
  { to: '/perfil/configuracion', label: 'Mi perfil',    icon: Settings },
];

export default function Profile() {
  const user = useUser((s) => s.user);

  return (
    <div className="pt-20 min-h-screen bg-coffee-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <p className="text-gold-500 text-xs tracking-[0.3em] uppercase mb-1">Bienvenido</p>
          <h1 className="font-serif text-3xl text-cream">{user?.name}</h1>
          <p className="text-coffee-400 text-sm mt-1">{user?.email}</p>
        </div>

        <div className="flex gap-1 border-b border-coffee-800 mb-8 overflow-x-auto">
          {tabs.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
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
          <Route path="configuracion" element={<ProfileSettings />} />
        </Routes>
      </div>
    </div>
  );
}
