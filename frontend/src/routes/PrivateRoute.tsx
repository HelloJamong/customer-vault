import { Navigate } from 'react-router-dom';
import { useAuthStore, isAuthenticated } from '@/store/authStore';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const authenticated = isAuthenticated();

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
