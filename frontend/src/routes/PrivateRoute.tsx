import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ACCESS_TOKEN_KEY } from '@/utils/constants';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const authenticated = useAuthStore((state) => {
    const hasToken = !!sessionStorage.getItem(ACCESS_TOKEN_KEY);
    return !!state.user && hasToken;
  });

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
