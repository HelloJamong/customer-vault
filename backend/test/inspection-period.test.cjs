const test = require('node:test');
const assert = require('node:assert/strict');
const { getInspectionPeriodStart } = require('../src/common/utils/inspection-period.util.ts');

test('매월 점검은 이번 달만 완료 기간으로 인정한다', () => {
  const now = new Date(2026, 11, 15); // 2026-12-15
  const start = getInspectionPeriodStart('매월', now);
  assert.deepEqual(start, new Date(2026, 11, 1));
});

test('분기 점검(12월 예정)은 10~12월 중 아무 때나 업로드해도 완료로 인정한다', () => {
  const now = new Date(2026, 11, 20); // 2026-12-20, 12월 점검 예정
  const start = getInspectionPeriodStart('분기', now);
  assert.deepEqual(start, new Date(2026, 9, 1)); // 10월 1일부터

  const earlyInspection = new Date(2026, 10, 5); // 11월에 앞당겨 점검
  assert.ok(earlyInspection >= start, '11월 점검이 분기 완료 기간에 포함되어야 함');
});

test('연1회 점검(9월 예정)은 전년 10월부터 당해 9월까지 아무 때나 업로드해도 완료로 인정한다', () => {
  const now = new Date(2026, 8, 30); // 2026-09-30, 9월 점검 예정
  const start = getInspectionPeriodStart('연1회', now);
  assert.deepEqual(start, new Date(2025, 9, 1)); // 전년도 10월 1일부터

  const earlyInspection = new Date(2026, 5, 10); // 같은 해 6월에 앞당겨 점검
  assert.ok(earlyInspection >= start, '6월 점검이 연1회 완료 기간에 포함되어야 함');
});

test('반기 점검(12월 예정)은 7~12월 중 아무 때나 업로드해도 완료로 인정한다', () => {
  const now = new Date(2026, 11, 1); // 2026-12-01
  const start = getInspectionPeriodStart('반기', now);
  assert.deepEqual(start, new Date(2026, 6, 1)); // 7월 1일부터
});
