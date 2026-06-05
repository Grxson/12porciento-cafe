import { useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { CartProvider } from './context/CartContext';
import { useUser } from './context/UserContext';
import { NotificationsProvider } from './context/NotificationsContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}
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
import AdminCustomers from './admin/Customers';
import AdminInventory from './admin/Inventory';
import ToastContainer from './components/Toast';
import NotFound from './pages/NotFound';
import Quiz from './pages/Quiz';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/admin/login" replace />;
};

const UserRoute = ({ children }: { children: React.ReactNode }) => {
  const token = useUser((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

const PublicLayout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex flex-col">
    <Navbar />
    <main className="flex-1">{children}</main>
    <Footer />
  </div>
);

export default function App() {
  return (
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
        <Route path="/recetas" element={<PublicLayout><Recipes /></PublicLayout>} />
        <Route path="/login" element={<Login />} />
        <Route path="/registro" element={<Register />} />
        <Route
          path="/perfil/*"
          element={
            <UserRoute>
              <PublicLayout><Profile /></PublicLayout>
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
          <Route path="inventario" element={<AdminInventory />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </CartProvider>
    </NotificationsProvider>
  );
}
