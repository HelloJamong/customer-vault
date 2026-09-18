import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { ACCESS_TOKEN_KEY } from '@/utils/constants';

interface PrivateRouteProps {
  children: React.ReactNode;
}

export const PrivateRoute: React.FC<PrivateRouteProps> = ({ children }) => {
  const user = useAuthStore((state) => state.user);
  const authenticated = !!user && !!sessionStorage.getItem(ACCESS_TOKEN_KEY);

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.isFirstLogin || user?.passwordExpired || user?.mfaSetupRequired) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
