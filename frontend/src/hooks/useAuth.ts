import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types/auth.types';

interface LogoutOptions {
  redirectState?: Record<string, unknown>;
  skipRequest?: boolean;
}

interface LoginOptions {
  onDuplicateSession?: () => void;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const { login: setAuth, logout: clearAuth, user } = useAuthStore();

  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
    onSuccess: (data) => {
      setAuth(data.accessToken, data.refreshToken, data.user);
      navigate('/dashboard');
    },
    onError: (error: any, _variables, context: any) => {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || '로그인에 실패했습니다.';

      // 중복 세션 에러인 경우
      if (message === 'DUPLICATE_SESSION') {
        if (context?.onDuplicateSession) {
          context.onDuplicateSession();
        }
        return;
      }

      alert(message);
    },
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: async (options?: LogoutOptions) => {
      if (options?.skipRequest) {
        return;
      }
      await authAPI.logout();
    },
    onSuccess: (_data, variables) => {
      clearAuth();
      navigate('/login', { state: variables?.redirectState });
    },
    onError: (_error, variables) => {
      // 에러가 발생해도 로컬 스토리지는 클리어
      clearAuth();
      navigate('/login', { state: variables?.redirectState });
    },
  });

  const login = (credentials: LoginRequest, options?: LoginOptions) => {
    loginMutation.mutate(credentials, {
      onError: (error: any) => {
        console.error('Login failed:', error);

        const message = error.response?.data?.message || '로그인에 실패했습니다.';

        // 중복 세션 에러인 경우
        if (message === 'DUPLICATE_SESSION') {
          if (options?.onDuplicateSession) {
            options.onDuplicateSession();
          }
          return;
        }

        alert(message);
      },
    });
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
  };
};
