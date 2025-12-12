import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';

export const useDashboard = () => {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 30000, // 30초마다 자동 갱신
  });

  return {
    stats,
    isLoading,
    error,
    refetch,
  };
};
