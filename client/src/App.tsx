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
import VerifyEmail from './pages/VerifyEmail';
import Profile from './pages/Profile';
import ToastContainer from './components/Toast';
import NotFound from './pages/NotFound';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import OfflineIndicator from './components/OfflineIndicator';
import Quiz from './pages/Quiz';
import B2BCatalog from './pages/B2BCatalog';
import Gallery from './pages/Gallery';
import BaristaProfile from './pages/BaristaProfile';
import Leaderboard from './pages/Leaderboard';
import Feed from './pages/Feed';
import AchievementGallery from './pages/AchievementGallery';
import RewardShop from './pages/RewardShop';
import Bundles from './pages/Bundles';
import GiftCardPurchase from './pages/GiftCardPurchase';

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
  useEffect(() => {
    setVisible(false);
  }, [pathname]);

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

  const FOOTER_ROUTES = [
    '/',
    '/tienda',
    '/suscripciones',
    '/nosotros',
    '/paquetes',
    '/recetas',
    '/galeria',
  ];
  const showFooter = FOOTER_ROUTES.some(
    (p) => location.pathname === p || location.pathname.startsWith(p + '/'),
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Helmet>
        <title>12% — Café de Especialidad</title>
        <meta
          name="description"
          content="Café de especialidad mexicano. Solo el 12% del café producido en el mundo alcanza los estándares SCA. Selección directa de fincas en Veracruz y Chiapas."
        />
        <meta property="og:title" content="12% — Café de Especialidad" />
        <meta
          property="og:description"
          content="Café de especialidad mexicano. Solo el 12% del café producido en el mundo alcanza los estándares SCA."
        />
        <meta
          property="og:image"
          content="https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=1200&q=80"
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>
      <Navbar />
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1 pt-16 md:pt-20 pb-20 md:pb-0 focus:outline-none"
      >
        <AnimatePresence>
          <motion.div
            key={location.pathname.split('/')[1] || 'home'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      {showFooter && <Footer />}
      <BottomNav />
      <OfflineIndicator />
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
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:bg-gold-500 focus:text-coffee-950 focus:rounded focus:shadow-lg focus:outline-none"
      >
        Saltar al contenido principal
      </a>
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
                  <Route
                    path="/perfil/*"
                    element={
                      <UserRoute>
                        <Profile />
                      </UserRoute>
                    }
                  />
                  <Route path="/perfil/barista/:userId" element={<BaristaProfile />} />
                  <Route path="/b2b" element={<B2BCatalog />} />
                  <Route path="/leaderboard" element={<Leaderboard />} />
                  <Route path="/feed" element={<Feed />} />
                  <Route
                    path="/recompensas"
                    element={
                      <UserRoute>
                        <RewardShop />
                      </UserRoute>
                    }
                  />
                  <Route
                    path="/logros"
                    element={
                      <UserRoute>
                        <AchievementGallery />
                      </UserRoute>
                    }
                  />
                  <Route
                    path="/gift-card"
                    element={
                      <UserRoute>
                        <GiftCardPurchase />
                      </UserRoute>
                    }
                  />
                  <Route path="*" element={<NotFound />} />
                </Route>

                {/* Standalone pages (no layout) */}
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route path="/olvide-contrasena" element={<ForgotPassword />} />
                <Route path="/restablecer-contrasena/:token" element={<ResetPassword />} />
                <Route path="/verificar-email/:token" element={<VerifyEmail />} />
                <Route path="/quiz" element={<Quiz />} />
              </Routes>
            </CartProvider>
          </NotificationsProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </>
  );
}
