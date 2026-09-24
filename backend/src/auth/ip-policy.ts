import { cleanIpAddress } from '../common/utils/ip.util';

type AllowedIp = string | { ipAddress: string };

export interface IpRestrictedUser {
  allowedIps?: AllowedIp[];
}

export function normalizeIpAddress(ipAddress?: string): string {
  const cleanedIp = cleanIpAddress(ipAddress)?.trim().toLowerCase();
  if (!cleanedIp) return 'unknown';

  if (cleanedIp.includes(':')) {
    try {
      return new URL(`http://[${cleanedIp}]/`).hostname.slice(1, -1);
    } catch {
      return cleanedIp;
    }
  }

  return cleanedIp;
}

export function isIpAllowedForUser(
  user: IpRestrictedUser,
  requestIp?: string,
  restrictionEnabled = true,
): boolean {
  if (!restrictionEnabled) return true;

  const normalizedRequestIp = normalizeIpAddress(requestIp);
  return (user.allowedIps || []).some((allowed) => {
    const value = typeof allowed === 'string' ? allowed : allowed.ipAddress;
    return normalizeIpAddress(value) === normalizedRequestIp;
  });
}

export function isSessionIpMatch(sessionIp?: string | null, requestIp?: string): boolean {
  if (!sessionIp || !requestIp) return false;
  return normalizeIpAddress(sessionIp) === normalizeIpAddress(requestIp);
}
