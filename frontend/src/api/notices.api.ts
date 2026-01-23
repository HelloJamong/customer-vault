import apiClient from './axios';

export interface Notice {
  id: number;
  title: string;
  content: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator: {
    id: number;
    name: string;
    username: string;
  };
}

export interface CreateNoticeDto {
  title: string;
  content: string;
}

export interface UpdateNoticeDto {
  title?: string;
  content?: string;
}

export const noticesApi = {
  getAll: async (): Promise<Notice[]> => {
    const { data } = await apiClient.get('/notices');
    return data;
  },

  getOne: async (id: number): Promise<Notice> => {
    const { data } = await apiClient.get(`/notices/${id}`);
    return data;
  },

  create: async (dto: CreateNoticeDto): Promise<Notice> => {
    const { data } = await apiClient.post('/notices', dto);
    return data;
  },

  update: async (id: number, dto: UpdateNoticeDto): Promise<Notice> => {
    const { data } = await apiClient.patch(`/notices/${id}`, dto);
    return data;
  },

  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/notices/${id}`);
  },

  // 읽지 않은 공지사항 조회
  getUnreadNotices: async (): Promise<Notice[]> => {
    const { data } = await apiClient.get('/notices/unread/list');
    return data;
  },

  // 공지사항 읽음으로 표시
  markAsRead: async (id: number, dontShowAgain: boolean): Promise<void> => {
    await apiClient.post(`/notices/${id}/mark-read`, { dontShowAgain });
  },
};
