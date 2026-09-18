export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  USER = 'user',
}

export interface User {
  id: number;
  username: string;
  name: string;
  email?: string | null;
  role: UserRole;
  isActive?: boolean;
  is_active?: boolean;
  isFirstLogin?: boolean;
  passwordExpired?: boolean;
  mfaEnabled?: boolean;
  mfaSetupRequired?: boolean;
  lastLogin?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  forceLogin?: boolean;
}

export interface LoginResponse {
  accessToken?: string;
  refreshToken?: string;
  user: User;
  session?: SessionPolicy;
  mfaRequired?: boolean;
  mfaChallengeToken?: string;
}

export interface MfaSetupResponse {
  qrCode: string;
  manualKey: string;
  issuer: string;
  account: string;
  periodSeconds: number;
}

export interface MfaChallengeResponse {
  mfaRequired: true;
  mfaChallengeToken: string;
  user: Pick<User, 'id' | 'username' | 'name'>;
}

export interface SessionPolicy {
  timeoutMinutes: number;
  warningEnabled: boolean;
  warningSeconds: number;
  expiresAt: string;
}

export interface RefreshTokenResponse {
  accessToken: string;
  session: SessionPolicy;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
