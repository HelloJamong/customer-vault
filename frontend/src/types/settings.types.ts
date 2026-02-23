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
  // 백업 설정
  backupEnabled: boolean;
  backupScheduleType: string;
  backupScheduleHour: number;
  backupScheduleDay: number | null;
  backupTargetDb: boolean;
  backupTargetDocs: boolean;
  backupDestLocal: boolean;
  backupDestRemote: boolean;
  backupRetentionCount: number;
  sftpHost: string | null;
  sftpUsername: string | null;
  sftpPassword: string | null;
  sftpKeyPath: string | null;
  sftpRemotePath: string | null;
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
  // 백업 설정
  backupEnabled?: boolean;
  backupScheduleType?: string;
  backupScheduleHour?: number;
  backupScheduleDay?: number;
  backupTargetDb?: boolean;
  backupTargetDocs?: boolean;
  backupDestLocal?: boolean;
  backupDestRemote?: boolean;
  backupRetentionCount?: number;
  sftpHost?: string;
  sftpUsername?: string;
  sftpPassword?: string;
  sftpKeyPath?: string;
  sftpRemotePath?: string;
}

export interface UpdateSettingsResponse {
  message: string;
  updatedAt: string;
}
