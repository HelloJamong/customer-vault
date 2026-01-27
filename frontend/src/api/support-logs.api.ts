import apiClient from './axios';
import type { SupportLog, CreateSupportLogDto, UpdateSupportLogDto } from '@/types/support-log.types';

export interface PendingNotification {
  customerId: number;
  customerName: string;
  count: number;
  latestSupportDate: Date | null;
}

export const supportLogsAPI = {
  // 진행 중인 지원 현황 알림 조회
  getPendingNotifications: async (): Promise<PendingNotification[]> => {
    const { data } = await apiClient.get('/support-logs/pending-notifications');
    return data;
  },

  // 고객사별 지원 로그 목록 조회
  getAllByCustomer: async (customerId: number): Promise<SupportLog[]> => {
    const { data } = await apiClient.get(`/support-logs/customer/${customerId}`);
    return data;
  },

  // 지원 로그 상세 조회
  getById: async (id: number): Promise<SupportLog> => {
    const { data } = await apiClient.get(`/support-logs/${id}`);
    return data;
  },

  // 지원 로그 생성
  create: async (dto: CreateSupportLogDto): Promise<SupportLog> => {
    const { data } = await apiClient.post('/support-logs', dto);
    return data;
  },

  // 지원 로그 수정
  update: async (id: number, dto: UpdateSupportLogDto): Promise<SupportLog> => {
    const { data } = await apiClient.patch(`/support-logs/${id}`, dto);
    return data;
  },

  // 지원 로그 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/support-logs/${id}`);
  },
};
