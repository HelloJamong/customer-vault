export interface SystemSettings {
  id: number;
  defaultPassword: string;
  passwordMinLength: number;
  passwordRequireUppercase: boolean;
  passwordRequireSpecial: boolean;
  passwordRequireNumber: boolean;
  passwordExpiryEnabled: boolean;
  passwordExpiryDays: number;
  preventDuplicateLogin: boolean;
  loginFailureLimitEnabled: boolean;
  loginFailureLimit: number;
  accountLockMinutes: number;
  jiraEnabled: boolean;
  jiraBaseUrl: string | null;
  updatedAt: string;
  updatedBy: number | null;
}

export interface UpdateSettingsRequest {
  defaultPassword?: string;
  passwordMinLength?: number;
  passwordRequireUppercase?: boolean;
  passwordRequireSpecial?: boolean;
  passwordRequireNumber?: boolean;
  passwordExpiryEnabled?: boolean;
  passwordExpiryDays?: number;
  preventDuplicateLogin?: boolean;
  loginFailureLimitEnabled?: boolean;
  loginFailureLimit?: number;
  accountLockMinutes?: number;
  jiraEnabled?: boolean;
  jiraBaseUrl?: string;
}

export interface UpdateSettingsResponse {
  message: string;
  updatedAt: string;
}
