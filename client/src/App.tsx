import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { CartProvider } from './context/CartContext';
import { useUser } from './context/UserContext';
import { NotificationsProvider } from './context/NotificationsContext';
import ErrorBoundary from './components/ErrorBoundary';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
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

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUser((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

function PublicLayout({ children }: { children: React.ReactNode }) {
  const clientTheme = useClientTheme();
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
      <ThemeSync store={clientTheme} />
      <Navbar />
      <main className="flex-1 pb-20 md:pb-0">{children}</main>
      <Footer />
      <BottomNav />
      <OfflineBanner />
      <InstallPrompt />
    </div>
  );
}

export default function App() {
  return (
    <HelmetProvider>
    <ErrorBoundary>
    <NotificationsProvider>
    <CartProvider>
      <ToastContainer />
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<PublicLayout><Home /></PublicLayout>} />
        <Route path="/tienda" element={<PublicLayout><Shop /></PublicLayout>} />
        <Route path="/tienda/:slug" element={<PublicLayout><ProductDetail /></PublicLayout>} />
        <Route path="/suscripciones" element={<PublicLayout><Subscriptions /></PublicLayout>} />
        <Route path="/nosotros" element={<PublicLayout><About /></PublicLayout>} />
        <Route path="/carrito" element={<PublicLayout><Cart /></PublicLayout>} />
        <Route path="/checkout" element={<PublicLayout><Checkout /></PublicLayout>} />
        <Route path="/paquetes" element={<PublicLayout><Bundles /></PublicLayout>} />
        <Route path="/recetas" element={<PublicLayout><Recipes /></PublicLayout>} />
        <Route path="/galeria" element={<PublicLayout><Gallery /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route path="/olvide-contrasena" element={<ForgotPassword />} />
        <Route path="/restablecer-contrasena/:token" element={<ResetPassword />} />
        <Route
          path="/perfil/*"
          element={
            <UserRoute>
              <PublicLayout><Profile /></PublicLayout>
            </UserRoute>
          }
        />
        <Route path="/perfil/barista/:userId" element={<PublicLayout><BaristaProfile /></PublicLayout>} />
        <Route path="/leaderboard" element={<PublicLayout><Leaderboard /></PublicLayout>} />
        <Route
          path="/logros"
          element={
            <UserRoute>
              <PublicLayout><AchievementGallery /></PublicLayout>
            </UserRoute>
          }
        />

        <Route path="/quiz" element={<Quiz />} />

        <Route path="/admin/login" element={<AdminLogin />} />
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
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </CartProvider>
    </NotificationsProvider>
    </ErrorBoundary>
    </HelmetProvider>
  );
}
