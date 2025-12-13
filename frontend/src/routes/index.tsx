import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { RoleRoute } from './RoleRoute';
import { UserRole } from '@/types/auth.types';

// Layouts
import MainLayout from '@/components/layout/MainLayout';

// Pages
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import CustomersPage from '@/pages/CustomersPage';
import CustomerDetailPage from '@/pages/CustomerDetailPage';
import CustomerDocumentsPage from '@/pages/CustomerDocumentsPage';
import UsersPage from '@/pages/UsersPage';
import DocumentsPage from '@/pages/DocumentsPage';
import SettingsPage from '@/pages/SettingsPage';
import UnauthorizedPage from '@/pages/UnauthorizedPage';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/',
    element: (
      <PrivateRoute>
        <MainLayout />
      </PrivateRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: 'dashboard',
        element: <DashboardPage />,
      },
      {
        path: 'customers',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <CustomersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <CustomerDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/documents',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <CustomerDocumentsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'users',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <UsersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'documents',
        element: <DocumentsPage />,
      },
      {
        path: 'settings',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
            <SettingsPage />
          </RoleRoute>
        ),
      },
    ],
  },
  {
    path: '/unauthorized',
    element: <UnauthorizedPage />,
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);
