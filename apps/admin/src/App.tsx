import { useEffect, useState, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from '@12porciento/shared';
import { ErrorBoundary } from '@12porciento/ui';
import AdminLogin from './admin/AdminLogin';
import AdminLayout from './admin/AdminLayout';
import Dashboard from './admin/Dashboard';
import AdminSkeleton from './admin/components/AdminSkeleton';

const AdminProducts = lazy(() => import('./admin/Products'));
const AdminOrders = lazy(() => import('./admin/Orders'));
const AdminSubscribers = lazy(() => import('./admin/Subscribers'));
const AdminReviews = lazy(() => import('./admin/Reviews'));
const AdminBundles = lazy(() => import('./admin/Bundles'));
const AdminPromoCodes = lazy(() => import('./admin/PromoCodes'));
const AdminUsers = lazy(() => import('./admin/AdminUsers'));
const AdminCustomers = lazy(() => import('./admin/Customers'));
const AdminInventory = lazy(() => import('./admin/Inventory'));
const AdminRecipesPage = lazy(() => import('./admin/Recipes'));
const Achievements = lazy(() => import('./admin/Achievements'));
const SubscriptionPayments = lazy(() => import('./admin/SubscriptionPayments'));
const AdminNotificationSettings = lazy(() => import('./admin/AdminNotificationSettings'));
const AdminB2BOrders = lazy(() => import('./admin/B2BOrders'));
const B2BInquiries = lazy(() => import('./admin/B2BInquiries'));
const AbandonedCarts = lazy(() => import('./admin/AbandonedCarts'));
const Logistics = lazy(() => import('./admin/Logistics'));
const AdminLog = lazy(() => import('./admin/AdminLog'));
const AdminLotes = lazy(() => import('./admin/Lotes'));
const AdminCaficultores = lazy(() => import('./admin/Caficultores'));
const AdminUbicaciones = lazy(() => import('./admin/Ubicaciones'));
const AdminTiposCata = lazy(() => import('./admin/TiposCata'));
const AdminGiftCards = lazy(() => import('./admin/GiftCards'));
const AdminPricing = lazy(() => import('./admin/Pricing'));

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ErrorBoundary>
          <Routes>
            <Route path="/login" element={<AdminLogin />} />
            <Route
              path="/"
              element={
                <AdminRoute>
                  <ErrorBoundary>
                    <AdminLayout />
                  </ErrorBoundary>
                </AdminRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
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
              <Route path="b2b" element={<AdminB2BOrders />} />
              <Route path="consultas-b2b" element={<B2BInquiries />} />
              <Route path="carritos-abandonados" element={<AbandonedCarts />} />
              <Route path="logistica" element={<Logistics />} />
              <Route path="auditoria" element={<AdminLog />} />
              <Route path="lotes" element={<AdminLotes />} />
              <Route path="caficultores" element={<AdminCaficultores />} />
              <Route path="ubicaciones" element={<AdminUbicaciones />} />
              <Route path="tipos-cata" element={<AdminTiposCata />} />
              <Route path="gift-cards" element={<AdminGiftCards />} />
              <Route path="pricing" element={<AdminPricing />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ErrorBoundary>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
