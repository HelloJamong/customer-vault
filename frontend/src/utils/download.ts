/**
 * Content-Disposition 헤더에서 파일명을 추출한다.
 * RFC 5987 형식(filename*=UTF-8''%ED...)을 우선 처리하고, 없으면 filename= 로 폴백한다.
 */
export function filenameFromContentDisposition(
  header: string | undefined | null,
  fallback: string,
): string {
  if (!header) return fallback;

  const star = header.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
  if (star) {
    try {
      return decodeURIComponent(star[1].trim().replace(/^["']|["']$/g, ''));
    } catch {
      // 잘못된 인코딩이면 아래 plain 처리로
    }
  }

  const plain = header.match(/filename\s*=\s*"?([^";]+)"?/i);
  return plain ? plain[1].trim() : fallback;
}

/**
 * Blob 데이터를 브라우저 다운로드로 저장한다.
 * revokeObjectURL은 다운로드가 시작될 시간을 준 뒤 호출한다(Firefox/Safari에서 빈 파일 방지).
 */
export function downloadBlob(data: BlobPart, filename: string, type?: string): void {
  const blob = type ? new Blob([data], { type }) : new Blob([data]);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
