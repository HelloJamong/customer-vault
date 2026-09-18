import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import { queryClient } from '@/lib/queryClient';
import type { LoginRequest, LoginResponse } from '@/types/auth.types';
import { getApiErrorMessage } from '@/utils/api-error';

interface LogoutOptions {
  redirectState?: Record<string, unknown>;
  skipRequest?: boolean;
}

interface LoginOptions {
  onDuplicateSession?: () => void;
  onMfaRequired?: (data: LoginResponse) => void;
}

export const useAuth = () => {
  const navigate = useNavigate();
  const { login: setAuth, logout: clearAuth, setUser, user } = useAuthStore();

  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
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
      queryClient.clear(); // 이전 사용자 데이터가 다음 로그인에 노출되지 않도록
      navigate('/login', { state: variables?.redirectState });
    },
    onError: (_error, variables) => {
      // 에러가 발생해도 로컬 스토리지는 클리어
      clearAuth();
      queryClient.clear();
      navigate('/login', { state: variables?.redirectState });
    },
  });

  const login = (credentials: LoginRequest, options?: LoginOptions) => {
    loginMutation.mutate(credentials, {
      onSuccess: (data) => {
        if (data.mfaRequired) {
          options?.onMfaRequired?.(data);
          return;
        }
        if (!data.accessToken || !data.refreshToken || !data.session) {
          alert('로그인 응답이 올바르지 않습니다.');
          return;
        }
        setAuth(data.accessToken, data.refreshToken, data.user, data.session);
        if (!data.user.isFirstLogin && !data.user.passwordExpired && !data.user.mfaSetupRequired) {
          navigate('/dashboard');
        }
      },
      onError: (error) => {
        console.error('Login failed:', error);

        const message = getApiErrorMessage(error, '로그인에 실패했습니다.');

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

  const completeMfaLogin = (data: LoginResponse) => {
    if (!data.accessToken || !data.refreshToken || !data.session) {
      throw new Error('OTP 로그인 응답이 올바르지 않습니다.');
    }
    setAuth(data.accessToken, data.refreshToken, data.user, data.session);
    if (!data.user.isFirstLogin && !data.user.passwordExpired && !data.user.mfaSetupRequired) {
      navigate('/dashboard');
    }
  };

  const completeMfaSetup = () => {
    if (user) {
      setUser({ ...user, mfaEnabled: true, mfaSetupRequired: false });
    }
    navigate('/dashboard');
  };

  return {
    user,
    isAuthenticated: !!user,
    login,
    completeMfaLogin,
    completeMfaSetup,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
  };
};
