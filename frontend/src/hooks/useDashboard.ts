import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';
import { isAuthenticated } from '@/store/authStore';

export const useDashboard = () => {
  const authenticated = isAuthenticated();

  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    enabled: authenticated, // 인증된 사용자만 쿼리 실행
    retry: false, // 재시도 완전히 비활성화
    staleTime: 0, // 항상 데이터를 stale로 간주하여 invalidate 시 즉시 재조회
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
    refetchOnWindowFocus: false, // 윈도우 포커스 시 자동 재조회 비활성화
    refetchOnMount: true, // 마운트 시 재조회 활성화 (기본값)
    refetchOnReconnect: false, // 재연결 시 재조회 비활성화
    refetchInterval: false, // 자동 갱신 비활성화 (무한 루프 방지)
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
