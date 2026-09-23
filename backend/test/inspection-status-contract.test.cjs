const test = require('node:test');
const assert = require('node:assert/strict');
const { InspectionStatusService } = require('../src/inspection-status/inspection-status.service');

const customer = (overrides) => ({
  id: 1,
  name: '가나다은행',
  contractType: '유상',
  inspectionCycleType: '매월',
  inspectionCycleMonth: null,
  engineer: null,
  engineerSub: null,
  inspectionTargets: [{ id: 10, targetType: '정기점검', customName: null, productName: 'VMFT' }],
  documents: [],
  ...overrides,
});

const missingPeriods = async (c, year) => {
  const service = new InspectionStatusService({ customer: { findMany: async () => [c] } });
  const { customers } = await service.getMissingInspections(year);
  return customers[0]?.missingTargets.map((t) => t.missingPeriod) ?? [];
};

test('계약 시작 이전 월은 누락 점검서로 표시하지 않는다 (7월 시작 → 1~6월 제외)', async () => {
  const periods = await missingPeriods(customer({ contractStartDate: new Date('2025-07-15T00:00:00Z'), contractEndDate: null }), 2025);
  assert.deepEqual(periods, ['7월', '8월', '9월', '10월', '11월', '12월']);
});

test('계약 종료 이후 월은 누락 점검서로 표시하지 않는다', async () => {
  const periods = await missingPeriods(customer({ contractStartDate: new Date('2024-01-01T00:00:00Z'), contractEndDate: new Date('2025-03-31T00:00:00Z') }), 2025);
  assert.deepEqual(periods, ['1월', '2월', '3월']);
});

test('계약 시작 연도 이전은 누락이 없고, 계약일이 없으면 기존처럼 연중 전체를 본다', async () => {
  assert.deepEqual(await missingPeriods(customer({ contractStartDate: new Date('2026-07-01T00:00:00Z') }), 2025), []);
  assert.equal((await missingPeriods(customer({ contractStartDate: null, contractEndDate: null }), 2025)).length, 12);
});

test('분기 점검도 계약 시작 이전 예정 월은 제외한다', async () => {
  const periods = await missingPeriods(customer({
    inspectionCycleType: '분기',
    inspectionCycleMonth: 3,
    contractStartDate: new Date('2025-07-01T00:00:00Z'),
  }), 2025);
  assert.deepEqual(periods, ['3분기 (9월)', '4분기 (12월)']);
});
