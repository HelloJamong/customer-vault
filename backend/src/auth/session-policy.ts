// 브라우저 연결이 끊긴 세션도 인증/갱신 시 동일한 유휴 만료 기준을 적용한다.
export const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
export const MIN_SESSION_TIMEOUT_MINUTES = 10;
export const MAX_SESSION_TIMEOUT_MINUTES = 60;
export const SESSION_WARNING_SECONDS = 60;

export function getSessionTimeoutMinutes(settings: { sessionTimeoutMinutes?: number } | null | undefined) {
  const configuredMinutes = settings?.sessionTimeoutMinutes ?? DEFAULT_SESSION_TIMEOUT_MINUTES;
  if (!Number.isFinite(configuredMinutes)) return DEFAULT_SESSION_TIMEOUT_MINUTES;
  return Math.min(
    MAX_SESSION_TIMEOUT_MINUTES,
    Math.max(MIN_SESSION_TIMEOUT_MINUTES, configuredMinutes),
  );
}

export function getSessionTimeoutMs(settings: { sessionTimeoutMinutes?: number } | null | undefined) {
  return getSessionTimeoutMinutes(settings) * 60 * 1000;
}

export function isPasswordExpired(
  changedAt: Date | null,
  settings: { passwordExpiryEnabled: boolean; passwordExpiryDays: number } | null,
): boolean {
  if (!settings?.passwordExpiryEnabled) return false;
  return !changedAt || Date.now() - changedAt.getTime() >= settings.passwordExpiryDays * 86400000;
}
