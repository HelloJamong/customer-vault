import apiClient from './axios';

export interface DashboardStats {
  totalUsers: number;
  adminUsers: number;
  regularUsers: number;
  totalCustomers: number;
  inspection: {
    currentMonth: string;
    totalCustomers: number;
    completed: number;
    incomplete: number;
    completionRate: number;
  };
  systemResources: {
    storage: {
      used: number;
      total: number;
      usagePercent: number;
      unit: string;
    };
    memory: {
      used: number;
      total: number;
      usagePercent: number;
      unit: string;
    };
    cpu: {
      usagePercent: number;
      cores: number;
    };
  };
}

export const dashboardApi = {
  getStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get<DashboardStats>('/dashboard/stats');
    return response.data;
  },
};
