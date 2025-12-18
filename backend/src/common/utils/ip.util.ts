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
