import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';

import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/SuperAdmin/Dashboard';
import AdminOutlets from './pages/SuperAdmin/Outlets';
import AdminReports from './pages/SuperAdmin/Reports';
import AdminSettings from './pages/Admin/Settings';

// Outlet operator pages
import OutletHome from './pages/Operator/Home';
import OperatorOrders from './pages/Operator/Orders';
import AllOrders from './pages/Operator/AllOrders';
import OperatorKDS from './pages/Operator/KDS';
import ZomatoOrders from './pages/Operator/ZomatoOrders';
import SwiggyOrders from './pages/Operator/SwiggyOrders';
import BillingPage from './pages/Operator/Billing';
import OutletReports from './pages/Operator/OutletReports';

// Outlet manager pages
import MenuPage from './pages/OutletAdmin/Menu';
import TablesPage from './pages/OutletAdmin/Tables';
import TaxSettings from './pages/OutletAdmin/TaxSettings';
import CategoriesPage from './pages/OutletAdmin/Categories';

function HomeRedirect() {
  const { session } = useAuthStore();
  if (!session) return <Navigate to="/login" replace />;
  if (session.type === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/outlet/home" replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/unauthorized" element={<div className="p-8 text-center text-red-500 font-semibold">Access Denied</div>} />

      {/* Admin routes */}
      <Route path="/admin/*" element={
        <ProtectedRoute require="admin">
          <Layout>
            <Routes>
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="outlets" element={<AdminOutlets />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />

      {/* Outlet routes — operator + manager share the same layout */}
      <Route path="/outlet/*" element={
        <ProtectedRoute require="outlet">
          <Layout>
            <Routes>
              {/* Operator mode pages */}
              <Route path="home" element={<OutletHome />} />
              <Route path="pos" element={<OperatorOrders />} />
              <Route path="all-orders" element={<AllOrders />} />
              <Route path="kds" element={<OperatorKDS />} />
              <Route path="zomato" element={<ZomatoOrders />} />
              <Route path="swiggy" element={<SwiggyOrders />} />
              <Route path="billing/:orderId" element={<BillingPage />} />
              <Route path="reports" element={<OutletReports />} />
              {/* Manager mode pages */}
              <Route path="menu" element={<MenuPage />} />
              <Route path="categories" element={<CategoriesPage />} />
              <Route path="tables" element={<TablesPage />} />
              <Route path="settings" element={<TaxSettings />} />
              <Route path="*" element={<Navigate to="/outlet/home" replace />} />
            </Routes>
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}
