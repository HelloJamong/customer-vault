import apiClient from './axios';

interface SystemLogEntry {
  id: number;
  timestamp: string;
  username: string;
  userId: number;
  logType: string;
  action: string;
  description: string;
  ipAddress: string;
  beforeValue?: string;
  afterValue?: string;
}

interface SystemLogsResponse {
  data: SystemLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export type { SystemLogEntry, SystemLogsResponse };

export interface SystemLogsFilters {
  username?: string;
  logType?: string;
  searchText?: string;
  ipAddress?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export const logsApi = {
  getSystemLogs: async (filters?: SystemLogsFilters): Promise<SystemLogsResponse> => {
    const params = new URLSearchParams();

    if (filters?.username) params.append('username', filters.username);
    if (filters?.logType) params.append('logType', filters.logType);
    if (filters?.searchText) params.append('searchText', filters.searchText);
    if (filters?.ipAddress) params.append('ipAddress', filters.ipAddress);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate) params.append('endDate', filters.endDate);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const response = await apiClient.get<SystemLogsResponse>(
      `/logs/system?${params.toString()}`
    );
    return response.data;
  },
};
