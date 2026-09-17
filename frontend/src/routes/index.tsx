import { lazy } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { PrivateRoute } from './PrivateRoute';
import { RoleRoute } from './RoleRoute';
import { UserRole } from '@/types/auth.types';

// Layouts
import MainLayout from '@/components/layout/MainLayout';

// Pages are loaded on demand so large editor/export dependencies do not inflate
// the initial application bundle.
const LoginPage = lazy(() => import('@/pages/LoginPage'));
const DashboardPage = lazy(() => import('@/pages/DashboardPage'));
const CustomersPage = lazy(() => import('@/pages/CustomersPage'));
const CustomerDetailPage = lazy(() => import('@/pages/CustomerDetailPage'));
const CustomerEditPage = lazy(() => import('@/pages/CustomerEditPage'));
const CustomerDocumentsPage = lazy(() => import('@/pages/CustomerDocumentsPage'));
const CustomerUpgradePlanPage = lazy(() => import('@/pages/CustomerUpgradePlanPage'));
const CustomerUpgradePlanEditPage = lazy(() => import('@/pages/CustomerUpgradePlanEditPage'));
const CustomerSourceManagementDetailPage = lazy(() => import('@/pages/CustomerSourceManagementDetailPage'));
const CustomerSourceManagementEditPage = lazy(() => import('@/pages/CustomerSourceManagementEditPage'));
const CustomerSupportLogsPage = lazy(() => import('@/pages/CustomerSupportLogsPage'));
const CustomerMeetingMinutesPage = lazy(() => import('@/pages/CustomerMeetingMinutesPage'));
const DocumentViewerPage = lazy(() => import('@/pages/DocumentViewerPage'));
const SuperAdminsPage = lazy(() => import('@/pages/SuperAdminsPage'));
const AdminsPage = lazy(() => import('@/pages/AdminsPage'));
const UsersPage = lazy(() => import('@/pages/UsersPage'));
const DocumentsPage = lazy(() => import('@/pages/DocumentsPage'));
const SettingsPage = lazy(() => import('@/pages/SettingsPage'));
const UnauthorizedPage = lazy(() => import('@/pages/UnauthorizedPage'));
const SystemLogsPage = lazy(() => import('@/pages/SystemLogsPage'));
const UploadLogsPage = lazy(() => import('@/pages/UploadLogsPage'));
const LoginLogsPage = lazy(() => import('@/pages/LoginLogsPage'));
const InspectionStatusPage = lazy(() =>
  import('@/pages/InspectionStatusPage').then(({ InspectionStatusPage: page }) => ({ default: page })),
);
const AssignmentStatusPage = lazy(() =>
  import('@/pages/AssignmentStatusPage').then(({ AssignmentStatusPage: page }) => ({ default: page })),
);
const NoticesPage = lazy(() => import('@/pages/NoticesPage'));
const BackupPage = lazy(() => import('@/pages/BackupPage'));

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
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomersPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/edit',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerEditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/documents',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerDocumentsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/upgrade-plan',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerUpgradePlanPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/upgrade-plan/edit',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerUpgradePlanEditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/source-management',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerSourceManagementDetailPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/source-management/edit',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerSourceManagementEditPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/support-logs',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerSupportLogsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'customers/:customerId/meeting-minutes',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <CustomerMeetingMinutesPage />
          </RoleRoute>
        ),
      },
      {
        path: 'documents/:documentId/view',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.USER]}>
            <DocumentViewerPage />
          </RoleRoute>
        ),
      },
      {
        path: 'super-admins',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <SuperAdminsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'admins',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <AdminsPage />
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
      {
        path: 'backup',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
            <BackupPage />
          </RoleRoute>
        ),
      },
      {
        path: 'logs/system',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
            <SystemLogsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'logs/upload',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <UploadLogsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'logs/login',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <LoginLogsPage />
          </RoleRoute>
        ),
      },
      {
        path: 'work-status/inspections',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <InspectionStatusPage />
          </RoleRoute>
        ),
      },
      {
        path: 'work-status/assignments',
        element: (
          <RoleRoute allowedRoles={[UserRole.SUPER_ADMIN, UserRole.ADMIN]}>
            <AssignmentStatusPage />
          </RoleRoute>
        ),
      },
      {
        path: 'notices',
        element: <NoticesPage />,
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
