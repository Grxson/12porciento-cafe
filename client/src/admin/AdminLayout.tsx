import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import {
  LayoutDashboard, Package, ShoppingBag, Users, LogOut,
  ExternalLink, Star, Gift, Menu, X, Tag, UserSearch,
} from 'lucide-react';

const navLinks = [
  { to: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { to: '/admin/productos',    label: 'Productos',    icon: Package },
  { to: '/admin/pedidos',      label: 'Pedidos',      icon: ShoppingBag },
  { to: '/admin/suscriptores', label: 'Suscriptores', icon: Users },
  { to: '/admin/bundles',      label: 'Bundles',      icon: Gift },
  { to: '/admin/resenas',      label: 'Reseñas',      icon: Star },
  { to: '/admin/clientes',     label: 'Clientes',     icon: UserSearch },
  { to: '/admin/descuentos',   label: 'Descuentos',   icon: Tag },
];

const pageTitles: Record<string, string> = {
  '/admin/dashboard':    'Dashboard',
  '/admin/productos':    'Productos',
  '/admin/pedidos':      'Pedidos',
  '/admin/suscriptores': 'Suscriptores',
  '/admin/bundles':      'Bundles',
  '/admin/resenas':      'Reseñas',
  '/admin/clientes':     'Clientes',
  '/admin/descuentos':   'Descuentos',
};

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const currentTitle = pageTitles[location.pathname] ?? 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/admin/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-coffee-950 flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-coffee-950/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 w-60 bg-coffee-900 border-r border-coffee-800 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-coffee-800 flex items-center justify-between">
          <div>
            <div className="font-serif text-2xl font-black text-cream">12%</div>
            <div className="text-[9px] tracking-[0.3em] text-gold-500 uppercase">panel admin</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-coffee-400 hover:text-cream transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 border-l-2 pl-[10px] ${
                      isActive
                        ? 'bg-coffee-800 text-cream border-gold-500'
                        : 'text-coffee-400 hover:text-cream hover:bg-coffee-800/40 border-transparent'
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
      <main className="flex-1 lg:ml-60 min-h-screen flex flex-col">
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-coffee-950/95 backdrop-blur-sm border-b border-coffee-800 h-14 flex items-center px-4 sm:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-coffee-400 hover:text-cream transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-coffee-600 text-sm hidden sm:inline">12%</span>
            <span className="text-coffee-600 text-sm hidden sm:inline">/</span>
            <h1 className="text-cream text-sm font-medium truncate">{currentTitle}</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-coffee-500 text-xs hidden md:block">
              {new Date().toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
            <div className="w-7 h-7 bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <span className="text-gold-500 text-xs font-bold">A</span>
            </div>
          </div>
        </header>

        <div className="flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
