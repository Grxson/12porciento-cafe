import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { useUser } from './context/UserContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ErrorBoundary from './components/ErrorBoundary';
import { useUpdateNotification } from './hooks/useUpdateNotification';
import UpdateNotificationModal from './components/UpdateNotificationModal';
import { useToast } from './context/ToastContext';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowUpToLine } from 'lucide-react';

function ScrollToTop() {
  const { pathname } = useLocation();
  const navType = useNavigationType();
  const prevPathname = useRef(pathname);

  useEffect(() => {
    // Save scroll position before navigating away
    if (prevPathname.current !== pathname) {
      sessionStorage.setItem(`scroll:${prevPathname.current}`, String(window.scrollY));
    }
    prevPathname.current = pathname;
  }, [pathname]);

  useEffect(() => {
    // POP = back/forward → restore saved position
    // PUSH/REPLACE = link click → scroll to top
    if (navType === 'POP') {
      const saved = sessionStorage.getItem(`scroll:${pathname}`);
      if (saved) {
        requestAnimationFrame(() => window.scrollTo(0, parseInt(saved, 10)));
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, navType]);

  return null;
}
import { Helmet } from 'react-helmet-async';
import { ThemeSync, useClientTheme } from './context/ThemeContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Shop from './pages/Shop';
import ProductDetail from './pages/ProductDetail';
import Subscriptions from './pages/Subscriptions';
import About from './pages/About';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import Recipes from './pages/Recipes';
import RecipeDetail from './pages/RecipeDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminProducts from './admin/Products';
import AdminOrders from './admin/Orders';
import AdminSubscribers from './admin/Subscribers';
import AdminReviews from './admin/Reviews';
import AdminBundles from './admin/Bundles';
import AdminPromoCodes from './admin/PromoCodes';
import AdminUsers from './admin/AdminUsers';
import AdminCustomers from './admin/Customers';
import AdminInventory from './admin/Inventory';
import AdminRecipesPage from './admin/Recipes';
import Achievements from './admin/Achievements';
import SubscriptionPayments from './admin/SubscriptionPayments';
import AdminNotificationSettings from './admin/AdminNotificationSettings';
import B2BInquiries from './admin/B2BInquiries';
import AbandonedCarts from './admin/AbandonedCarts';
import Logistics from './admin/Logistics';
import ToastContainer from './components/Toast';
import NotFound from './pages/NotFound';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import Quiz from './pages/Quiz';
import Gallery from './pages/Gallery';
import BaristaProfile from './pages/BaristaProfile';
import Leaderboard from './pages/Leaderboard';
import AchievementGallery from './pages/AchievementGallery';
import Bundles from './pages/Bundles';
import GiftCardPurchase from './pages/GiftCardPurchase';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUser((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function ScrollToTopFab() {
  const [visible, setVisible] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => {
    const handler = () => setVisible(window.scrollY > 300);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // Hide on route change
  useEffect(() => { setVisible(false); }, [pathname]);

  if (!visible) return null;

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-24 right-4 md:bottom-8 md:right-8 z-50 w-10 h-10 bg-gold-500 text-coffee-950 flex items-center justify-center shadow-lg hover:bg-gold-400 transition-colors"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Volver arriba"
    >
      <ArrowUpToLine className="w-4 h-4" />
    </motion.button>
  );
}

function PublicLayout() {
  const location = useLocation();
  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>12% — Café de Especialidad</title>
        <meta name="description" content="Café de especialidad mexicano. Solo el 12% del café producido en el mundo alcanza los estándares SCA. Selección directa de fincas en Veracruz y Chiapas." />
        <meta property="og:title" content="12% — Café de Especialidad" />
        <meta property="og:description" content="Café de especialidad mexicano. Solo el 12% del café producido en el mundo alcanza los estándares SCA." />
        <meta property="og:image" content="https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <Navbar />
      <main className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0">
        <AnimatePresence>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <Footer />
      <BottomNav />
      <OfflineBanner />
      <InstallPrompt />
      <ScrollToTopFab />
    </div>
  );
}

function PWAUpdateManager() {
  const { showNotification, handleDismiss, handleUpdate } = useUpdateNotification();
  const addToast = useToast((s) => s.add);

  useEffect(() => {
    const justUpdated = localStorage.getItem('pwa_just_updated');
    if (justUpdated) {
      localStorage.removeItem('pwa_just_updated');
      addToast('Hemos actualizado el diseño de la app ✨', 'success', 4000);
    }
  }, [addToast]);

  return (
    <UpdateNotificationModal
      open={showNotification}
      onUpdate={handleUpdate}
      onDismiss={handleDismiss}
    />
  );
}

export default function App() {
  const clientTheme = useClientTheme();
  return (
    <HelmetProvider>
    <ErrorBoundary>
    <NotificationsProvider>
    <CartProvider>
      <ThemeSync store={clientTheme} />
      <ToastContainer />
      <PWAUpdateManager />
      <ScrollToTop />
      <Routes>
        {/* Public client routes (with Navbar/Footer layout) */}
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/tienda" element={<Shop />} />
          <Route path="/tienda/:slug" element={<ProductDetail />} />
          <Route path="/suscripciones" element={<Subscriptions />} />
          <Route path="/nosotros" element={<About />} />
          <Route path="/carrito" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/paquetes" element={<Bundles />} />
          <Route path="/recetas" element={<Recipes />} />
          <Route path="/recetas/:slug" element={<RecipeDetail />} />
          <Route path="/galeria" element={<Gallery />} />
          <Route path="/perfil/*" element={<UserRoute><Profile /></UserRoute>} />
          <Route path="/perfil/barista/:userId" element={<BaristaProfile />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/logros" element={<UserRoute><AchievementGallery /></UserRoute>} />
          <Route path="/gift-card" element={<UserRoute><GiftCardPurchase /></UserRoute>} />
          <Route path="*" element={<NotFound />} />
        </Route>

        {/* Standalone pages (no layout) */}
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/olvide-contrasena" element={<ForgotPassword />} />
        <Route path="/restablecer-contrasena/:token" element={<ResetPassword />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Admin routes */}
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="productos" element={<AdminProducts />} />
          <Route path="pedidos" element={<AdminOrders />} />
          <Route path="suscriptores" element={<AdminSubscribers />} />
          <Route path="bundles" element={<AdminBundles />} />
          <Route path="resenas" element={<AdminReviews />} />
          <Route path="clientes" element={<AdminCustomers />} />
          <Route path="descuentos" element={<AdminPromoCodes />} />
          <Route path="usuarios" element={<AdminUsers />} />
          <Route path="inventario" element={<AdminInventory />} />
          <Route path="recetas" element={<AdminRecipesPage />} />
          <Route path="logros" element={<Achievements />} />
          <Route path="pagos-suscripciones" element={<SubscriptionPayments />} />
          <Route path="notificaciones" element={<AdminNotificationSettings />} />
          <Route path="consultas-b2b" element={<B2BInquiries />} />
          <Route path="carritos-abandonados" element={<AbandonedCarts />} />
          <Route path="logistica" element={<Logistics />} />
        </Route>
      </Routes>
    </CartProvider>
    </NotificationsProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
}
