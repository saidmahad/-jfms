import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/layout/AppLayout.tsx';
import { PageLoader } from './components/ui/Spinner.tsx';
import { useAuth } from './contexts/AuthContext.tsx';
import { hasPermission, type Permission } from './lib/permissions.ts';
import LoginPage from './pages/LoginPage.tsx';
import DashboardPage from './pages/DashboardPage.tsx';
import SalesListPage from './pages/SalesListPage.tsx';
import NewSalePage from './pages/NewSalePage.tsx';
import SaleDetailPage from './pages/SaleDetailPage.tsx';
import FuelsPage from './pages/FuelsPage.tsx';
import PumpsPage from './pages/PumpsPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import InventoryMovementsPage from './pages/InventoryMovementsPage.tsx';
import SuppliersPage from './pages/SuppliersPage.tsx';
import CustomersPage from './pages/CustomersPage.tsx';
import EmployeesPage from './pages/EmployeesPage.tsx';
import ExpensesPage from './pages/ExpensesPage.tsx';
import ReportsPage from './pages/ReportsPage.tsx';
import UsersPage from './pages/UsersPage.tsx';
import AuditLogsPage from './pages/AuditLogsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import ProfilePage from './pages/ProfilePage.tsx';
import NotificationsPage from './pages/NotificationsPage.tsx';
import ForbiddenPage from './pages/ForbiddenPage.tsx';
import ErrorPage from './pages/ErrorPage.tsx';
import NotFoundPage from './pages/NotFoundPage.tsx';
import type { ReactNode } from 'react';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader label="Restoring your session…" />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequirePermission({ permission, children }: { permission: Permission; children: ReactNode }) {
  const { user } = useAuth();
  if (!user || !hasPermission(user.role, permission)) return <Navigate to="/403" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/sales/new"
          element={
            <RequirePermission permission="sales.create">
              <NewSalePage />
            </RequirePermission>
          }
        />
        <Route path="/sales" element={<SalesListPage />} />
        <Route path="/sales/:id" element={<SaleDetailPage />} />
        <Route path="/fuels" element={<FuelsPage />} />
        <Route path="/pumps" element={<PumpsPage />} />
        <Route
          path="/inventory"
          element={
            <RequirePermission permission="inventory.manage">
              <InventoryPage />
            </RequirePermission>
          }
        />
        <Route
          path="/inventory/movements"
          element={
            <RequirePermission permission="inventory.manage">
              <InventoryMovementsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/suppliers"
          element={
            <RequirePermission permission="supplier.manage">
              <SuppliersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/customers"
          element={
            <RequirePermission permission="customer.manage">
              <CustomersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/employees"
          element={
            <RequirePermission permission="employee.manage">
              <EmployeesPage />
            </RequirePermission>
          }
        />
        <Route
          path="/expenses"
          element={
            <RequirePermission permission="expense.manage">
              <ExpensesPage />
            </RequirePermission>
          }
        />
        <Route
          path="/reports"
          element={
            <RequirePermission permission="report.view">
              <ReportsPage />
            </RequirePermission>
          }
        />
        <Route
          path="/users"
          element={
            <RequirePermission permission="user.manage">
              <UsersPage />
            </RequirePermission>
          }
        />
        <Route
          path="/audit-logs"
          element={
            <RequirePermission permission="audit.view">
              <AuditLogsPage />
            </RequirePermission>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
      </Route>

      <Route path="/403" element={<ForbiddenPage />} />
      <Route path="/500" element={<ErrorPage />} />
      <Route path="*" element={<NotFoundPage />} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
