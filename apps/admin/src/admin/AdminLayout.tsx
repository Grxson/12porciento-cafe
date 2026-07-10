import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Suspense, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  LogOut,
  ExternalLink,
  Star,
  Gift,
  Menu,
  X,
  Tag,
  UserSearch,
  Warehouse,
  BookOpen,
  Shield,
  Sun,
  Moon,
  Award,
  CreditCard,
  MessageCircle,
  Bell,
  ShoppingCart,
  Truck,
  ClipboardList,
  DollarSign,
  Briefcase,
  MapPin,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { ThemeSync, useAdminTheme } from '../context/ThemeContext';
import NotificationBell from '../components/NotificationBell';
import { ModuleProvider } from './context/ModuleContext';
import ToastContainer from './components/ToastContainer';
import AdminSkeleton from './components/AdminSkeleton';

const dashboardLink = { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard };

const navGroups = [
  {
    label: 'Catálogo',
    items: [
      { to: '/productos', label: 'Productos', icon: Package },
      { to: '/inventario', label: 'Inventario', icon: Warehouse },
      { to: '/lotes', label: 'Lotes', icon: Package },
      { to: '/caficultores', label: 'Caficultores', icon: Users },
      { to: '/ubicaciones', label: 'Ubicaciones', icon: MapPin },
      { to: '/tipos-cata', label: 'Tipos de Cata', icon: Tag },
      { to: '/recetas', label: 'Recetas', icon: BookOpen },
      { to: '/bundles', label: 'Bundles', icon: Gift },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { to: '/pedidos', label: 'Pedidos', icon: ShoppingBag },
      { to: '/logistica', label: 'Logística', icon: Truck },
      { to: '/carritos-abandonados', label: 'Carritos Abandonados', icon: ShoppingCart },
      { to: '/gift-cards', label: 'Gift Cards', icon: CreditCard },
      { to: '/descuentos', label: 'Descuentos', icon: Tag },
      { to: '/pricing', label: 'Precios', icon: DollarSign },
      { to: '/b2b', label: 'Clientes B2B', icon: Briefcase },
      { to: '/consultas-b2b', label: 'Leads B2B', icon: MessageCircle },
      { to: '/pagos-suscripciones', label: 'Pagos Suscripciones', icon: CreditCard },
    ],
  },
  {
    label: 'Clientes',
    items: [
      { to: '/clientes', label: 'Clientes', icon: UserSearch },
      { to: '/suscriptores', label: 'Suscriptores', icon: Users },
      { to: '/resenas', label: 'Reseñas', icon: Star },
      { to: '/logros', label: 'Logros', icon: Award },
    ],
  },
  {
    label: 'Config',
    items: [
      { to: '/usuarios', label: 'Usuarios Admin', icon: Shield },
      { to: '/notificaciones', label: 'Notificaciones', icon: Bell },
      { to: '/auditoria', label: 'Auditoría', icon: ClipboardList },
    ],
  },
];

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/productos': 'Productos',
  '/inventario': 'Inventario',
  '/recetas': 'Recetas',
  '/pedidos': 'Pedidos',
  '/logistica': 'Logística',
  '/suscriptores': 'Suscriptores',
  '/bundles': 'Bundles',
  '/resenas': 'Reseñas',
  '/clientes': 'Clientes',
  '/usuarios': 'Usuarios Admin',
  '/descuentos': 'Descuentos',
  '/logros': 'Logros',
  '/pagos-suscripciones': 'Pagos Suscripciones',
  '/consultas-b2b': 'Leads B2B',
  '/notificaciones': 'Notificaciones',
  '/carritos-abandonados': 'Carritos Abandonados',
  '/auditoria': 'Auditoría',
  '/b2b': 'Clientes B2B',
  '/lotes': 'Gestión de Lotes',
  '/caficultores': 'Caficultores',
  '/ubicaciones': 'Ubicaciones',
  '/tipos-cata': 'Tipos de Cata',
  '/gift-cards': 'Gift Cards',
  '/pricing': 'Precios',
};

function AdminLayoutInner() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('admin_sidebar_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const adminTheme = useAdminTheme();

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => {
      const next = { ...prev, [label]: !prev[label] };
      localStorage.setItem('admin_sidebar_collapsed', JSON.stringify(next));
      return next;
    });
  }, []);

  const currentTitle = pageTitles[location.pathname] ?? 'Admin';

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-coffee-50 dark:bg-coffee-950 flex">
      <ThemeSync store={adminTheme} />
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-coffee-950/70 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full z-40 w-60 bg-coffee-100 dark:bg-coffee-900 border-r border-coffee-200 dark:border-coffee-800 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="p-6 border-b border-coffee-200 dark:border-coffee-800 flex items-center justify-between">
          <div>
            <div className="font-serif text-2xl font-black text-coffee-900 dark:text-cream">
              12%
            </div>
            <div className="text-xs tracking-widest text-gold-500 uppercase">panel admin</div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
            aria-label="Cerrar menú"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          <ul className="space-y-1">
            <li key={dashboardLink.to}>
              <NavLink
                to={dashboardLink.to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 border-l-2 pl-[10px] ${
                    isActive
                      ? 'bg-coffee-200 dark:bg-coffee-800 text-coffee-900 dark:text-cream border-gold-500'
                      : 'text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-200/60 dark:hover:bg-coffee-800/40 border-transparent'
                  }`
                }
              >
                <dashboardLink.icon className="w-4 h-4 shrink-0" />
                {dashboardLink.label}
              </NavLink>
            </li>
          </ul>

          {navGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.label] ?? false;
            return (
              <div key={group.label} className="mt-4">
                <button
                  onClick={() => toggleGroup(group.label)}
                  className="w-full flex items-center justify-between px-3 pb-1 text-[11px] font-semibold tracking-widest text-coffee-500 dark:text-coffee-500 uppercase hover:text-coffee-700 dark:hover:text-coffee-300 transition-colors"
                >
                  {group.label}
                  {isCollapsed ? (
                    <ChevronRight className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
                <AnimatePresence initial={false}>
                  {!isCollapsed && (
                    <motion.ul
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2, ease: 'easeInOut' }}
                      className="space-y-1 overflow-hidden"
                    >
                      {group.items.map(({ to, label, icon: Icon }) => (
                        <li key={to}>
                          <NavLink
                            to={to}
                            onClick={() => setSidebarOpen(false)}
                            className={({ isActive }) =>
                              `flex items-center gap-3 px-3 py-2.5 text-sm transition-all duration-150 border-l-2 pl-[10px] ${
                                isActive
                                  ? 'bg-coffee-200 dark:bg-coffee-800 text-coffee-900 dark:text-cream border-gold-500'
                                  : 'text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-200/60 dark:hover:bg-coffee-800/40 border-transparent'
                              }`
                            }
                          >
                            <Icon className="w-4 h-4 shrink-0" />
                            {label}
                          </NavLink>
                        </li>
                      ))}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-coffee-200 dark:border-coffee-800 space-y-1">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Ver sitio
          </a>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-coffee-600 dark:text-coffee-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 lg:ml-60 min-h-screen flex flex-col focus:outline-none"
      >
        {/* Top header */}
        <header className="sticky top-0 z-20 bg-coffee-50/95 dark:bg-coffee-950/95 backdrop-blur-sm border-b border-coffee-200 dark:border-coffee-800 h-14 flex items-center px-4 sm:px-6 gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream transition-colors"
            aria-label="Abrir menú"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="text-coffee-500 text-sm hidden sm:inline">12%</span>
            <span className="text-coffee-500 text-sm hidden sm:inline">/</span>
            <h1 className="text-coffee-900 dark:text-cream text-sm font-medium truncate">
              {currentTitle}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-coffee-500 text-xs hidden md:block">
              {new Date().toLocaleDateString('es-MX', {
                weekday: 'short',
                day: 'numeric',
                month: 'short',
              })}
            </span>
            <button
              onClick={adminTheme.toggle}
              className="p-1.5 rounded-md text-coffee-600 dark:text-coffee-400 hover:text-coffee-900 dark:hover:text-cream hover:bg-coffee-200 dark:hover:bg-coffee-800 transition-colors"
              aria-label="Toggle theme"
            >
              {adminTheme.dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <NotificationBell />
            <div className="w-7 h-7 bg-gold-500/20 border border-gold-500/30 flex items-center justify-center">
              <span className="text-gold-500 text-xs font-bold">A</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-8">
          <Suspense fallback={<AdminSkeleton rows={6} />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function AdminLayout() {
  return (
    <ModuleProvider>
      <AdminLayoutInner />
      <ToastContainer />
    </ModuleProvider>
  );
}
