import apiClient from './axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  ChangePasswordRequest,
  SessionPolicy,
  RefreshTokenResponse,
} from '@/types/auth.types';

export const authAPI = {
  // 로그인
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  // 로그아웃
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // 현재 사용자 정보 조회
  getCurrentUser: async (): Promise<User> => {
    const { data } = await apiClient.get('/auth/me');
    return data;
  },

  // 토큰 갱신
  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const { data } = await apiClient.post('/auth/refresh', {
      refreshToken: refreshToken,
    });
    return data;
  },

  extendSession: async (): Promise<SessionPolicy> => {
    const { data } = await apiClient.post('/auth/extend-session');
    return data;
  },

  getSessionPolicy: async (): Promise<SessionPolicy> => {
    const { data } = await apiClient.get('/auth/session-policy');
    return data;
  },

  // 비밀번호 변경
  changePassword: async (req: ChangePasswordRequest): Promise<void> => {
    await apiClient.post('/auth/change-password', req);
  },
};
