import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation, useNavigationType } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { useUser } from './context/UserContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ErrorBoundary from './components/ErrorBoundary';
import { useUpdateNotification } from './hooks/useUpdateNotification';
import UpdateNotificationModal from './components/UpdateNotificationModal';
import MonthlyWrapTrigger from './components/MonthlyWrapTrigger';
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
import Cart from './pages/Cart';
import Login from './pages/Login';
import Register from './pages/Register';
import ToastContainer from './components/Toast';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import OfflineBanner from './components/OfflineBanner';
import OfflineIndicator from './components/OfflineIndicator';
import PageSkeleton from './components/PageSkeleton';

const Subscriptions = lazy(() => import('./pages/Subscriptions'));
const About = lazy(() => import('./pages/About'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Recipes = lazy(() => import('./pages/Recipes'));
const RecipeDetail = lazy(() => import('./pages/RecipeDetail'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const Profile = lazy(() => import('./pages/Profile'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Quiz = lazy(() => import('./pages/Quiz'));
const B2BCatalog = lazy(() => import('./pages/B2BCatalog'));
const Gallery = lazy(() => import('./pages/Gallery'));
const BaristaProfile = lazy(() => import('./pages/BaristaProfile'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));
const Feed = lazy(() => import('./pages/Feed'));
const AchievementGallery = lazy(() => import('./pages/AchievementGallery'));
const RewardShop = lazy(() => import('./pages/RewardShop'));
const Bundles = lazy(() => import('./pages/Bundles'));
const GiftCardPurchase = lazy(() => import('./pages/GiftCardPurchase'));

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
      className="scroll-top-fab fixed z-50 bg-gold-500 text-coffee-950 flex items-center justify-center shadow-lg hover:bg-gold-400 transition-colors"
      aria-label="Volver arriba"
    >
      <ArrowUpToLine className="w-4 h-4" />
    </motion.button>
  );
}

function PublicLayout() {
  const location = useLocation();
  const showBottomNav = location.pathname !== '/checkout';

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
    <div className="app-shell flex flex-col">
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
        className={`app-main flex-1 focus:outline-none ${showBottomNav ? '' : 'app-main--no-bottom-nav'}`}
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
      {showBottomNav && <BottomNav />}
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
  const user = useUser((s) => s.user);
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
              <MonthlyWrapTrigger key={user?.id} />
              <ScrollToTop />
              <Routes>
                {/* Public client routes (with Navbar/Footer layout) */}
                <Route element={<PublicLayout />}>
                  <Route path="/" element={<Home />} />
                  <Route path="/tienda" element={<Shop />} />
                  <Route path="/tienda/:slug" element={<ProductDetail />} />
                  <Route
                    path="/suscripciones"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Subscriptions />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/nosotros"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <About />
                      </Suspense>
                    }
                  />
                  <Route path="/carrito" element={<Cart />} />
                  <Route
                    path="/checkout"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Checkout />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/paquetes"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Bundles />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/recetas"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Recipes />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/recetas/:slug"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <RecipeDetail />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/galeria"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Gallery />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/perfil/*"
                    element={
                      <UserRoute>
                        <Suspense fallback={<PageSkeleton />}>
                          <Profile />
                        </Suspense>
                      </UserRoute>
                    }
                  />
                  <Route
                    path="/perfil/barista/:userId"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <BaristaProfile />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/b2b"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <B2BCatalog />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/leaderboard"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Leaderboard />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/feed"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <Feed />
                      </Suspense>
                    }
                  />
                  <Route
                    path="/recompensas"
                    element={
                      <UserRoute>
                        <Suspense fallback={<PageSkeleton />}>
                          <RewardShop />
                        </Suspense>
                      </UserRoute>
                    }
                  />
                  <Route
                    path="/logros"
                    element={
                      <UserRoute>
                        <Suspense fallback={<PageSkeleton />}>
                          <AchievementGallery />
                        </Suspense>
                      </UserRoute>
                    }
                  />
                  <Route
                    path="/gift-card"
                    element={
                      <UserRoute>
                        <Suspense fallback={<PageSkeleton />}>
                          <GiftCardPurchase />
                        </Suspense>
                      </UserRoute>
                    }
                  />
                  <Route
                    path="*"
                    element={
                      <Suspense fallback={<PageSkeleton />}>
                        <NotFound />
                      </Suspense>
                    }
                  />
                </Route>

                {/* Standalone pages (no layout) */}
                <Route path="/login" element={<Login />} />
                <Route path="/registro" element={<Register />} />
                <Route
                  path="/olvide-contrasena"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ForgotPassword />
                    </Suspense>
                  }
                />
                <Route
                  path="/restablecer-contrasena/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <ResetPassword />
                    </Suspense>
                  }
                />
                <Route
                  path="/verificar-email/:token"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <VerifyEmail />
                    </Suspense>
                  }
                />
                <Route
                  path="/quiz"
                  element={
                    <Suspense fallback={<PageSkeleton />}>
                      <Quiz />
                    </Suspense>
                  }
                />
              </Routes>
            </CartProvider>
          </NotificationsProvider>
        </ErrorBoundary>
      </HelmetProvider>
    </>
  );
}
