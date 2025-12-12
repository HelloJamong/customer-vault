import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '@/api/auth.api';
import { useAuthStore } from '@/store/authStore';
import type { LoginRequest } from '@/types/auth.types';

export const useAuth = () => {
  const navigate = useNavigate();
  const { login: setAuth, logout: clearAuth, user } = useAuthStore();

  // 로그인 뮤테이션
  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => authAPI.login(credentials),
    onSuccess: (data) => {
      setAuth(data.access_token, data.refresh_token, data.user);
      navigate('/dashboard');
    },
    onError: (error: any) => {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || '로그인에 실패했습니다.';
      alert(message);
    },
  });

  // 로그아웃 뮤테이션
  const logoutMutation = useMutation({
    mutationFn: () => authAPI.logout(),
    onSuccess: () => {
      clearAuth();
      navigate('/login');
    },
    onError: () => {
      // 에러가 발생해도 로컬 스토리지는 클리어
      clearAuth();
      navigate('/login');
    },
  });

  // 현재 사용자 정보 쿼리
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => authAPI.getCurrentUser(),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5분
  });

  return {
    user,
    currentUser,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    isLoginLoading: loginMutation.isPending,
  };
};
