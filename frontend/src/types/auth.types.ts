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
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
