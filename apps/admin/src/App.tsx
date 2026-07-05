import { useEffect, useState } from 'react';
import { Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { HelmetProvider } from 'react-helmet-async';
import { queryClient } from '@12porciento/shared';
import { ErrorBoundary } from '@12porciento/ui';
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
import AdminB2BOrders from './admin/B2BOrders';
import B2BInquiries from './admin/B2BInquiries';
import AbandonedCarts from './admin/AbandonedCarts';
import Logistics from './admin/Logistics';
import AdminLog from './admin/AdminLog';
import AdminLotes from './admin/Lotes';
import AdminCaficultores from './admin/Caficultores';
import AdminUbicaciones from './admin/Ubicaciones';
import AdminTiposCata from './admin/TiposCata';
import AdminGiftCards from './admin/GiftCards';
import AdminPricing from './admin/Pricing';

const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('admin_token');
  return token ? <>{children}</> : <Navigate to="/login" replace />;
};

export default function App() {
  return (
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/login" element={<AdminLogin />} />
          <Route
            path="/"
            element={
              <AdminRoute>
                <AdminLayout />
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
          </Route>
        </Routes>
      </QueryClientProvider>
    </HelmetProvider>
  );
}
