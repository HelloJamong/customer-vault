const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * 'YYYY-MM-DD' 문자열을 KST(UTC+9) 기준 하루 경계로 해석해 Prisma 범위 필터를 만든다.
 * - 시작일: 그날 00:00:00.000 KST
 * - 종료일: 그날 23:59:59.999 KST
 * 시작/종료 중 한쪽만 있어도 해당 방향만 적용한다. 둘 다 없으면 undefined.
 * (ISO 문자열이 오면 그대로 파싱)
 */
export function buildKstDateRange(
  startDate?: string,
  endDate?: string,
): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};

  if (startDate) {
    range.gte = DATE_ONLY.test(startDate)
      ? new Date(`${startDate}T00:00:00.000+09:00`)
      : new Date(startDate);
  }
  if (endDate) {
    range.lte = DATE_ONLY.test(endDate)
      ? new Date(`${endDate}T23:59:59.999+09:00`)
      : new Date(endDate);
  }

  return range.gte || range.lte ? range : undefined;
}

/**
 * buildKstDateRange 결과를 `{ [field]: { gte, lte } }` 형태로 감싼다.
 * 범위가 없으면 빈 객체를 반환하므로 `Object.assign(where, ...)`로 바로 병합할 수 있다.
 */
export function buildKstDateWhere(
  field: string,
  startDate?: string,
  endDate?: string,
): Record<string, { gte?: Date; lte?: Date }> {
  const range = buildKstDateRange(startDate, endDate);
  return range ? { [field]: range } : {};
}
