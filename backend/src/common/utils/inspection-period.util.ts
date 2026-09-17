const CYCLE_PERIOD_MONTHS: Record<string, number> = {
  '매월': 1,
  '분기': 3,
  '반기': 6,
  '연1회': 12,
};

/**
 * 점검 완료 판정 시작일.
 * 분기/반기/연1회 점검은 고객사 요청으로 예정 월보다 앞당겨 진행되는 경우가 있어,
 * 예정 월(now) 한 달만 보지 않고 주기 길이만큼 거슬러 올라간 기간 전체에서 완료 여부를 판단한다.
 * 예) 분기(3개월) 점검이 12월 예정이면 10~12월 중 아무 때나 업로드해도 완료로 인정.
 */
export function getInspectionPeriodStart(inspectionCycleType: string, now: Date = new Date()): Date {
  const months = CYCLE_PERIOD_MONTHS[inspectionCycleType] ?? 1;
  return new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
}
