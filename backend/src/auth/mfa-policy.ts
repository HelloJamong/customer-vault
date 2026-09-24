export interface MfaPolicySettings {
  otpEnabled?: boolean;
  otpApplyToAdministrators?: boolean;
  otpApplyToTechDepartment?: boolean;
  otpApplyToSalesDepartment?: boolean;
  otpApplyToDevDepartment?: boolean;
}

export interface MfaPolicyUser {
  role?: string | null;
  department?: string | null;
}

export function isMfaRequiredForUser(
  settings: MfaPolicySettings | null | undefined,
  user: MfaPolicyUser | null | undefined,
): boolean {
  if (!settings?.otpEnabled || !user) return false;

  const role = String(user.role ?? '').trim().toLowerCase();
  if (role === 'super_admin' || role === 'admin') {
    return settings.otpApplyToAdministrators ?? true;
  }

  switch (String(user.department ?? '').trim()) {
    case '기술팀':
      return settings.otpApplyToTechDepartment ?? true;
    case '영업팀':
      return settings.otpApplyToSalesDepartment ?? true;
    case '개발팀':
      return settings.otpApplyToDevDepartment ?? true;
    default:
      return false;
  }
}
