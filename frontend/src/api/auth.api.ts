import apiClient from './axios';
import type {
  LoginRequest,
  LoginResponse,
  User,
  ChangePasswordRequest,
  SessionPolicy,
  RefreshTokenResponse,
  MfaSetupResponse,
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

  verifyMfa: async (challengeToken: string, code: string): Promise<LoginResponse> => {
    const { data } = await apiClient.post('/auth/mfa/verify', { challengeToken, code });
    return data;
  },

  setupMfa: async (): Promise<MfaSetupResponse> => {
    const { data } = await apiClient.post('/auth/mfa/setup');
    return data;
  },

  confirmMfaSetup: async (code: string): Promise<{ enabled: boolean; message: string }> => {
    const { data } = await apiClient.post('/auth/mfa/setup/confirm', { code });
    return data;
  },

  getMfaStatus: async (): Promise<{ otpEnabled: boolean; requiredByPolicy: boolean; mfaEnabled: boolean; setupRequired: boolean }> => {
    const { data } = await apiClient.get('/auth/mfa/status');
    return data;
  },
};
