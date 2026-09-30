import apiClient from './axios';
import type { SupportLog, CreateSupportLogDto, UpdateSupportLogDto, SupportLogEntryDto } from '@/types/support-log.types';

export interface PendingNotification {
  customerId: number;
  customerName: string;
  inProgressCount: number;
  impossibleCount: number;
  onHoldCount: number;
  latestInProgressDate: Date | null;
}

export const supportLogsAPI = {
  // 진행 중인 지원 현황 알림 조회
  getPendingNotifications: async (): Promise<PendingNotification[]> => {
    const { data } = await apiClient.get('/support-logs/pending-notifications', {
      headers: { 'X-Session-Activity': 'false' },
    });
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

  // 지원 내역 추가/수정/삭제 (갱신된 지원 로그 반환)
  addEntry: async (id: number, dto: SupportLogEntryDto): Promise<SupportLog> => {
    const { data } = await apiClient.post(`/support-logs/${id}/entries`, dto);
    return data;
  },

  updateEntry: async (id: number, entryId: number, dto: SupportLogEntryDto): Promise<SupportLog> => {
    const { data } = await apiClient.put(`/support-logs/${id}/entries/${entryId}`, dto);
    return data;
  },

  deleteEntry: async (id: number, entryId: number): Promise<SupportLog> => {
    const { data } = await apiClient.delete(`/support-logs/${id}/entries/${entryId}`);
    return data;
  },
};
