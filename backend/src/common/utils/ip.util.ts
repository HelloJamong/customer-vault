/**
 * IPv6-mapped IPv4 주소에서 실제 IPv4 주소를 추출합니다.
 * 예: "::ffff:192.168.65.1" -> "192.168.65.1"
 *
 * @param ipAddress - 원본 IP 주소
 * @returns 정리된 IP 주소
 */
export function cleanIpAddress(ipAddress?: string): string | undefined {
  if (!ipAddress) {
    return ipAddress;
  }

  // IPv6-mapped IPv4 주소 형식인 경우 (::ffff:x.x.x.x)
  if (ipAddress.startsWith('::ffff:')) {
    return ipAddress.substring(7); // "::ffff:" 부분을 제거
  }

  return ipAddress;
}

/**
 * Request 객체에서 실제 클라이언트 IP를 추출합니다.
 *
 * Express의 `trust proxy` 설정(main.ts에서 신뢰 홉 수 고정)에 따라 계산된
 * `request.ip`만 사용한다. X-Forwarded-For / X-Real-IP 헤더를 직접 파싱하면
 * 클라이언트가 값을 위조해 감사 로그·레이트리밋을 조작할 수 있으므로 사용하지 않는다.
 *
 * @param request - Express Request 객체
 * @returns 클라이언트 IP 주소
 */
export function getClientIp(request: any): string {
  const ip = request.ip || request.socket?.remoteAddress || request.connection?.remoteAddress;
  return cleanIpAddress(ip) || ip || 'unknown';
}
