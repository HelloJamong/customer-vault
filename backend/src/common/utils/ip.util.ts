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
 * Docker/Proxy 환경에서 X-Forwarded-For, X-Real-IP 헤더를 우선적으로 확인합니다.
 *
 * @param request - Express Request 객체
 * @returns 클라이언트 IP 주소
 */
export function getClientIp(request: any): string {
  // 1. X-Forwarded-For 헤더 확인 (프록시/로드밸런서 환경)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    // X-Forwarded-For는 "client, proxy1, proxy2" 형태일 수 있으므로 첫 번째 IP 추출
    const ips = forwardedFor.split(',').map((ip: string) => ip.trim());
    return cleanIpAddress(ips[0]) || ips[0];
  }

  // 2. X-Real-IP 헤더 확인 (Nginx 등)
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return cleanIpAddress(realIp) || realIp;
  }

  // 3. request.ip 사용 (기본)
  const ip = request.ip || request.connection?.remoteAddress;
  return cleanIpAddress(ip) || ip || 'unknown';
}
