const test = require('node:test');
const assert = require('node:assert/strict');
const { ForbiddenException, NotFoundException, BadRequestException } = require('@nestjs/common');
const { SupportLogsService } = require('../src/support-logs/support-logs.service');

const author = { id: 1, name: '김지원', role: 'user' };
const other = { id: 2, name: '이동료', role: 'user' };
const admin = { id: 3, name: '박관리', role: 'admin' };

const createPrisma = (entry = { id: 7, supportLogId: 5, createdByUserId: author.id, authorName: author.name, content: '기존' }) => {
  const calls = { create: [], update: [], delete: [], logCreate: [] };
  const prisma = {
    supportLog: {
      findUnique: async () => ({ id: 5, customer: { id: 10, name: '가나다은행' }, entries: [] }),
      create: async (args) => { calls.logCreate.push(args); return { id: 5, customer: { id: 10, name: '가나다은행' } }; },
    },
    supportLogEntry: {
      findFirst: async ({ where }) => (entry && where.id === entry.id && where.supportLogId === entry.supportLogId ? entry : null),
      create: async ({ data }) => { calls.create.push(data); return { id: 8, ...data }; },
      update: async ({ data }) => { calls.update.push(data); return { ...entry, ...data }; },
      delete: async (args) => { calls.delete.push(args); return entry; },
    },
  };
  const logs = [];
  const service = new SupportLogsService(prisma, { createServiceLog: async (l) => { logs.push(l); } });
  return { service, calls, logs };
};

test('지원 내역 추가 시 지원자는 로그인 사용자로 고정되고 감사 로그가 남는다', async () => {
  const { service, calls, logs } = createPrisma();

  await service.addEntry(5, { entryDate: '2026-09-30', content: '  원격 점검 진행  ', authorName: '위조' }, author, '::1');

  assert.equal(calls.create[0].authorName, '김지원');
  assert.equal(calls.create[0].createdByUserId, 1);
  assert.equal(calls.create[0].supportLogId, 5);
  assert.equal(calls.create[0].content, '원격 점검 진행');
  assert.equal(calls.create[0].entryDate.toISOString().slice(0, 10), '2026-09-30');
  assert.equal(logs[0].action, '지원 내역 추가');
});

test('공백만 있는 내용은 거부된다', async () => {
  const { service } = createPrisma();
  await assert.rejects(service.addEntry(5, { entryDate: '2026-09-30', content: '   ' }, author, '::1'), BadRequestException);
});

test('다른 사용자의 지원 내역은 수정/삭제할 수 없다', async () => {
  const { service, calls } = createPrisma();

  await assert.rejects(service.updateEntry(5, 7, { entryDate: '2026-09-30', content: '변경' }, other, '::1'), ForbiddenException);
  await assert.rejects(service.removeEntry(5, 7, other, '::1'), ForbiddenException);
  assert.equal(calls.update.length, 0);
  assert.equal(calls.delete.length, 0);
});

test('작성자 본인과 관리자는 수정/삭제할 수 있고 수정해도 지원자는 바뀌지 않는다', async () => {
  const { service, calls } = createPrisma();

  await service.updateEntry(5, 7, { entryDate: '2026-10-01', content: '변경' }, admin, '::1');
  await service.removeEntry(5, 7, author, '::1');

  assert.equal(calls.update[0].content, '변경');
  assert.equal(calls.update[0].authorName, undefined);
  assert.equal(calls.delete.length, 1);
});

test('다른 지원 로그에 속한 내역 id로는 접근할 수 없다', async () => {
  const { service } = createPrisma();
  await assert.rejects(service.removeEntry(99, 7, admin, '::1'), NotFoundException);
});

test('지원 로그 생성 시 첫 지원 내역을 지원날짜로 함께 만든다', async () => {
  const { service, calls } = createPrisma();

  await service.create({ customerId: 10, supportDate: '2026-09-29', entryContent: ' 최초 대응 ' }, author, '::1');

  const data = calls.logCreate[0].data;
  assert.equal(data.createdBy, 1);
  assert.equal(data.actionContent, undefined);
  assert.deepEqual(data.entries.create, {
    entryDate: new Date('2026-09-29'),
    authorName: '김지원',
    content: '최초 대응',
    createdByUserId: 1,
  });
});

test('첫 지원 내역이 비어 있으면 내역을 만들지 않는다', async () => {
  const { service, calls } = createPrisma();
  await service.create({ customerId: 10, supportDate: '2026-09-29', entryContent: '  ' }, author, '::1');
  assert.equal(calls.logCreate[0].data.entries, undefined);
});

test('지원 로그 수정으로는 기존 기록(actionContent)을 바꿀 수 없다', async () => {
  const updates = [];
  const existing = { id: 5, actionContent: '기존 수기 기록', customer: { id: 10, name: '가나다은행' }, entries: [] };
  const service = new SupportLogsService({
    supportLog: {
      findUnique: async () => existing,
      update: async ({ data }) => { updates.push(data); return { ...existing, ...data }; },
    },
  }, { createServiceLog: async () => {} });

  await service.update(5, { title: '변경', actionContent: '덮어쓰기' }, 1, '::1');

  assert.equal(updates[0].title, '변경');
  assert.equal('actionContent' in updates[0], false);
});

test('UpdateSupportLogDto는 actionContent와 entryContent를 받지 않는다', async () => {
  const { ValidationPipe } = require('@nestjs/common');
  const { UpdateSupportLogDto } = require('../src/support-logs/dto/update-support-log.dto');
  const pipe = new ValidationPipe({ whitelist: true, transform: true });

  const dto = await pipe.transform({ title: '변경', actionContent: 'x', entryContent: 'y' }, { type: 'body', metatype: UpdateSupportLogDto });

  assert.deepEqual({ ...dto }, { title: '변경' });
});
