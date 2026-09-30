const test = require('node:test');
const assert = require('node:assert/strict');
const { convertLegacySupportLogs } = require('../src/support-logs/legacy-support-log-converter');

const updatedAt = new Date('2026-09-30T05:24:10.123Z');
const exportedAt = '2026-09-30 05:24:10.123000';

const baseLog = (extra) => ({
  id: 1,
  supportDate: new Date('2026-08-25T00:00:00Z'),
  title: null,
  actionContent: '@고석준-[26-08-25]\n- 원격제공\n@VMS[26-08-26]\n- 방문\n[26-08-27]\n- 이름 없음',
  updatedAt,
  creator: { id: 10, name: '안용욱' },
  _count: { entries: 0 },
  ...extra,
});

const createPrisma = (logs, { updateCount = 1 } = {}) => {
  const calls = { createMany: [], updateMany: [], serviceLog: [] };
  const tx = {
    supportLog: { updateMany: async (args) => { calls.updateMany.push(args); return { count: updateCount }; } },
    supportLogEntry: { createMany: async (args) => { calls.createMany.push(args.data); } },
    serviceLog: { create: async (args) => { calls.serviceLog.push(args.data); } },
  };
  const prisma = {
    user: { findMany: async () => [{ id: 1, name: '고석준' }, { id: 2, name: '안용욱' }, { id: 3, name: '동명' }, { id: 4, name: '동명' }] },
    supportLog: { findUnique: async ({ where }) => logs[where.id] ?? null },
    $transaction: async (fn) => fn(tx),
  };
  return { prisma, calls };
};

test('점검 모드는 DB를 바꾸지 않고 결과만 집계한다', async () => {
  const { prisma, calls } = createPrisma({ 1: baseLog() });
  const report = await convertLegacySupportLogs(prisma, [{ id: 1, updatedAt: exportedAt, title: '이미지 제공' }], { apply: false });

  assert.deepEqual(report.outcomes.converted, [1]);
  assert.equal(report.entryCount, 3);
  assert.equal(report.titleCount, 1);
  assert.deepEqual(report.labels, { 고석준: { count: 1, matchedUser: '고석준' }, VMS: { count: 1, matchedUser: null } });
  assert.equal(calls.updateMany.length + calls.createMany.length + calls.serviceLog.length, 0);
});

test('적용 시 계정 매칭·대체 규칙대로 지원 내역을 만들고 원문을 지우며 감사 로그를 남긴다', async () => {
  const { prisma, calls } = createPrisma({ 1: baseLog() });
  await convertLegacySupportLogs(prisma, [{ id: 1, updatedAt: exportedAt, title: '이미지 제공' }], { apply: true });

  assert.deepEqual(calls.createMany[0].map((e) => [e.entryDate.toISOString().slice(0, 10), e.authorName, e.createdByUserId, e.content]), [
    ['2026-08-25', '고석준', 1, '- 원격제공'],
    ['2026-08-26', '안용욱', 10, '[VMS]\n- 방문'], // 계정 없는 이름 → 최초 작성자 + 원래 이름 표기
    ['2026-08-27', '안용욱', 10, '- 이름 없음'], // 이름 없는 머리줄 → 최초 작성자
  ]);
  assert.deepEqual(calls.updateMany[0].where, { id: 1, updatedAt });
  assert.deepEqual(calls.updateMany[0].data, { actionContent: null, title: '이미지 제공' });
  assert.equal(JSON.parse(calls.serviceLog[0].beforeValue).actionContent, baseLog().actionContent);
});

test('동명이인 이름은 계정에 연결하지 않는다', async () => {
  const { prisma, calls } = createPrisma({ 1: baseLog({ actionContent: '@동명[26-08-25]\n- 지원' }) });
  await convertLegacySupportLogs(prisma, [{ id: 1, updatedAt: exportedAt }], { apply: true });
  assert.equal(calls.createMany[0][0].createdByUserId, 10);
  assert.equal(calls.createMany[0][0].content, '[동명]\n- 지원');
});

test('추출 이후 수정·이미 변환·경고·제목만 있는 경우를 구분한다', async () => {
  const { prisma, calls } = createPrisma({
    1: baseLog({ updatedAt: new Date('2026-09-30T06:00:00.000Z') }),
    2: baseLog({ id: 2, _count: { entries: 2 } }),
    3: baseLog({ id: 3, actionContent: '[26-00-00]\n- 예시' }),
    4: baseLog({ id: 4, actionContent: null }),
    5: baseLog({ id: 5, actionContent: null, title: '기존 제목' }),
  });
  const plan = [1, 2, 3, 4, 5, 6].map((id) => ({ id, updatedAt: exportedAt, title: '제안' }));
  const report = await convertLegacySupportLogs(prisma, plan, { apply: true });

  assert.deepEqual(report.outcomes.skipped_changed, [1]);
  assert.deepEqual(report.outcomes.skipped_has_entries, [2]);
  assert.deepEqual(report.outcomes.skipped_warning, [3]);
  assert.deepEqual(report.outcomes.title_only, [4]);
  assert.deepEqual(report.outcomes.nothing_to_do, [5]); // 기존 제목은 덮어쓰지 않음
  assert.deepEqual(report.outcomes.skipped_not_found, [6]);
  assert.deepEqual(calls.updateMany.map((c) => c.data), [{ title: '제안' }]);
  assert.equal(calls.createMany.length, 0);
});

test('적용 중 레코드가 바뀌면(조건부 갱신 0건) 내역을 만들지 않는다', async () => {
  const { prisma, calls } = createPrisma({ 1: baseLog() }, { updateCount: 0 });
  const report = await convertLegacySupportLogs(prisma, [{ id: 1, updatedAt: exportedAt }], { apply: true });
  assert.deepEqual(report.outcomes.skipped_changed, [1]);
  assert.equal(calls.createMany.length, 0);
  assert.equal(calls.serviceLog.length, 0);
});
