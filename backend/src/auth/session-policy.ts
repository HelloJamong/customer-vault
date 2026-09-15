// 브라우저 연결이 끊긴 세션도 인증/갱신 시 동일한 유휴 만료 기준을 적용한다.
export const SESSION_EXPIRY_MS = 30 * 60 * 1000;

export function isPasswordExpired(
  changedAt: Date | null,
  settings: { passwordExpiryEnabled: boolean; passwordExpiryDays: number } | null,
): boolean {
  if (!settings?.passwordExpiryEnabled) return false;
  return !changedAt || Date.now() - changedAt.getTime() >= settings.passwordExpiryDays * 86400000;
}
