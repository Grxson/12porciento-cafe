import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingBag, Users, LogOut, ExternalLink, Star, Gift } from 'lucide-react';

const navLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/productos', label: 'Productos', icon: Package },
  { to: '/admin/pedidos', label: 'Pedidos', icon: ShoppingBag },
  { to: '/admin/suscriptores', label: 'Suscriptores', icon: Users },
  { to: '/admin/bundles', label: 'Bundles', icon: Gift },
  { to: '/admin/resenas', label: 'Reseñas', icon: Star },
];

export default function AdminLayout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-coffee-950 flex">
      {/* Sidebar */}
      <aside className="w-60 bg-coffee-900 border-r border-coffee-800 flex flex-col fixed top-0 left-0 h-full z-40">
        <div className="p-6 border-b border-coffee-800">
          <div className="font-serif text-2xl font-black text-cream">12%</div>
          <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase">panel admin</div>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 ${
                      isActive
                        ? 'bg-coffee-800 text-cream border-l-2 border-gold-500 pl-[10px]'
                        : 'text-coffee-400 hover:text-cream hover:bg-coffee-800/40 border-l-2 border-transparent pl-[10px]'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-4 border-t border-coffee-800 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-coffee-400 hover:text-cream transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver sitio
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-coffee-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 ml-60 min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
