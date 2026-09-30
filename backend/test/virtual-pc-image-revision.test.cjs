const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException, ConflictException, NotFoundException } = require('@nestjs/common');
const { CustomersService } = require('../src/customers/customers.service');

const user = { id: 1, name: '김제작', role: 'user' };

const storedImage = () => ({
  id: 30,
  sourceManagementId: 9,
  name: '표준 이미지',
  osName: 'Windows 11',
  osEdition: 'Enterprise',
  osRelease: '23H2',
  cDiskCapacity: 100,
  dDiskCapacity: null,
  licenseStatus: '진행완료',
  licenseNote: null,
  hashValue: 'abc',
  revision: 2,
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-09-01T00:00:00Z'),
  verifier: { name: '이검증' },
  sourceManagement: { customer: { name: '가나다은행' } },
  installedPrograms: [{ id: 1, name: 'Office', version: '2021', description: null }],
  checklistItems: [{
    itemKey: 'boot_server_install',
    category: '구동 테스트',
    checked: true,
    checkedByName: '박검토',
    checkedAt: new Date('2026-09-02T00:00:00Z'),
    verified: true,
    verifiedByName: '이검증',
    verifiedAt: new Date('2026-09-03T00:00:00Z'),
    note: '정상',
  }],
});

// 호출된 모델 메서드를 모두 기록하는 prisma mock
const createPrisma = (overrides = {}) => {
  const calls = [];
  const model = (name) => new Proxy({}, {
    get: (_, method) => async (args) => {
      calls.push([`${name}.${String(method)}`, args]);
      const fn = overrides[`${name}.${String(method)}`];
      return fn ? fn(args) : (method === 'updateMany' || method === 'deleteMany' ? { count: 1 } : null);
    },
  });
  const prisma = new Proxy({}, {
    get: (_, name) => {
      if (name === '$transaction') return async (fn) => fn(prisma);
      if (name === '$queryRaw') {
        return async (strings, ...values) => {
          calls.push(['$queryRaw', { sql: strings.join('?'), values }]);
          return overrides.$queryRaw ? overrides.$queryRaw() : [];
        };
      }
      return model(String(name));
    },
  });
  return { prisma, calls };
};

const createService = (overrides) => {
  const { prisma, calls } = createPrisma(overrides);
  const logs = [];
  const service = new CustomersService(prisma, { createServiceLog: async (l) => { logs.push(l); } }, {});
  service.getSourceManagement = async () => ({ ok: true });
  return { service, calls, logs };
};

const findCall = (calls, name) => calls.find(([n]) => n === name)?.[1];

test('재제작 시 현재 판 스냅샷을 남기고 판 번호를 올리며 체크리스트를 전체 초기화한다', async () => {
  const { service, calls, logs } = createService({ 'virtualPcImage.findFirst': () => storedImage() });

  await service.rebuildVirtualPcImage(5, 30, { reason: ' Windows 24H2 적용 ', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1');

  assert.deepEqual(findCall(calls, 'virtualPcImage.findFirst').where, { id: 30, sourceManagement: { customerId: 5 } });

  const bump = findCall(calls, 'virtualPcImage.updateMany');
  assert.deepEqual(bump.where, { id: 30, revision: 2 });
  assert.deepEqual(bump.data, { revision: { increment: 1 } });

  const revision = findCall(calls, 'virtualPcImageRevision.create').data;
  assert.equal(revision.sourceManagementId, 9);
  assert.equal(revision.virtualPcImageId, 30);
  assert.equal(revision.revision, 2);
  assert.equal(revision.reason, 'Windows 24H2 적용');
  assert.equal(revision.rebuiltOn.toISOString().slice(0, 10), '2026-09-30');
  assert.equal(revision.createdByName, '김제작');
  assert.equal(revision.snapshot.osRelease, '23H2');
  assert.equal(revision.snapshot.verifierName, '이검증');
  assert.deepEqual(revision.snapshot.installedPrograms, [{ name: 'Office', version: '2021', description: null }]);
  assert.equal(revision.snapshot.checklistItems[0].checkedByName, '박검토');
  assert.equal(revision.snapshot.checklistItems[0].verifiedByName, '이검증');

  const reset = findCall(calls, 'virtualPcChecklistItem.updateMany');
  assert.deepEqual(reset.where, { virtualPcImageId: 30 });
  assert.deepEqual(reset.data, {
    checked: false, checkedByUserId: null, checkedByName: null, checkedAt: null,
    verified: false, verifiedByUserId: null, verifiedByName: null, verifiedAt: null,
    note: null,
  });
  assert.equal(logs[0].action, '가상PC 이미지 재제작');
});

test('다른 고객사 이미지나 없는 이미지는 재제작할 수 없다', async () => {
  const { service, calls } = createService({ 'virtualPcImage.findFirst': () => null });
  await assert.rejects(service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1'), NotFoundException);
  assert.equal(findCall(calls, 'virtualPcImageRevision.create'), undefined);
});

test('판 번호가 다르거나 동시에 재제작되면 거부한다', async () => {
  const stale = createService({ 'virtualPcImage.findFirst': () => storedImage() });
  await assert.rejects(stale.service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-09-30', revision: 1 }, user, '::1'), ConflictException);

  const raced = createService({
    'virtualPcImage.findFirst': () => storedImage(),
    'virtualPcImage.updateMany': () => ({ count: 0 }),
  });
  await assert.rejects(raced.service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1'), ConflictException);
  assert.equal(findCall(raced.calls, 'virtualPcChecklistItem.updateMany'), undefined);
});

test('재제작 사유는 필수다', async () => {
  const { service } = createService({ 'virtualPcImage.findFirst': () => storedImage() });
  await assert.rejects(service.rebuildVirtualPcImage(5, 30, { reason: '  ', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1'), BadRequestException);
});

const baseImageDto = (extra) => ({
  name: '표준 이미지', osName: 'Windows 11', osEdition: 'Enterprise', osRelease: '24H2',
  cDiskCapacity: 100, licenseStatus: '진행완료', ...extra,
});

const createUpdateService = (existingImages, lockedRows = existingImages) => createService({
  $queryRaw: () => lockedRows.map(({ id, revision }) => ({ id, revision })),
  'customer.findUnique': () => ({ id: 5, name: '가나다은행' }),
  'sourceManagement.findUnique': () => ({ id: 9, servers: [], accessInfo: [], hrMappings: [], virtualPcImages: existingImages }),
  'user.findUnique': () => ({ name: '김제작' }),
});

test('소스 관리 저장 시 기존 이미지의 id·판 번호를 유지하고, 제거된 이미지의 재제작 이력을 삭제한다', async () => {
  const kept = { ...storedImage(), checklistItems: [] };
  const removed = { ...storedImage(), id: 31, revision: 1, checklistItems: [] };
  const { service, calls } = createUpdateService([kept, removed]);

  await service.updateSourceManagement(5, {
    virtualPcImages: [
      baseImageDto({ id: 30, revision: 2 }),
      baseImageDto({ id: 999, name: '신규' }), // 이 고객사 소유가 아닌 id는 무시
    ],
  }, 1, '::1');

  const created = findCall(calls, 'sourceManagement.update').data.virtualPcImages.create;
  assert.equal(created[0].id, 30);
  assert.equal(created[0].revision, 2);
  assert.equal(created[1].id, undefined);
  assert.equal(created[1].revision, undefined);

  const revisionCleanup = findCall(calls, 'virtualPcImageRevision.deleteMany');
  assert.deepEqual(revisionCleanup.where, { sourceManagementId: 9, virtualPcImageId: { notIn: [30] } });
});

test('편집 중 다른 사용자가 재제작했으면 저장을 거부해 초기화된 체크리스트를 덮어쓰지 않는다', async () => {
  const { service, calls } = createUpdateService([{ ...storedImage(), checklistItems: [] }]);

  await assert.rejects(service.updateSourceManagement(5, {
    virtualPcImages: [baseImageDto({ id: 30, revision: 1 })],
  }, 1, '::1'), ConflictException);
  assert.equal(findCall(calls, 'sourceManagement.update'), undefined);
});

test('조회 후 저장 트랜잭션 전에 재제작이 끼어들면 잠금 읽기로 감지해 거부한다', async () => {
  const image = { ...storedImage(), checklistItems: [] };
  const { service, calls } = createUpdateService([image], [{ id: 30, revision: 3 }]);

  await assert.rejects(service.updateSourceManagement(5, {
    virtualPcImages: [baseImageDto({ id: 30, revision: 2 })],
  }, 1, '::1'), ConflictException);
  assert.match(findCall(calls, '$queryRaw').sql, /FOR UPDATE/);
  assert.equal(findCall(calls, 'virtualPcImage.deleteMany'), undefined);
});

test('중복 이미지 id나 판 번호 누락은 400으로 거부한다', async () => {
  const image = { ...storedImage(), checklistItems: [] };
  const dup = createUpdateService([image]);
  await assert.rejects(dup.service.updateSourceManagement(5, {
    virtualPcImages: [baseImageDto({ id: 30, revision: 2 }), baseImageDto({ id: 30, revision: 2 })],
  }, 1, '::1'), BadRequestException);

  const missing = createUpdateService([image]);
  await assert.rejects(missing.service.updateSourceManagement(5, {
    virtualPcImages: [baseImageDto({ id: 30 })],
  }, 1, '::1'), BadRequestException);
});

test('재제작 이력 판 번호가 이미 있으면 500 대신 409', async () => {
  const { service } = createService({
    'virtualPcImage.findFirst': () => storedImage(),
    'virtualPcImageRevision.create': () => { throw Object.assign(new Error('dup'), { code: 'P2002' }); },
  });
  await assert.rejects(service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1'), ConflictException);
});

test('재제작일은 한국 시간 기준 오늘까지만 허용한다', async (t) => {
  // 2026-09-30 23:30 KST = 2026-09-30 14:30 UTC
  t.mock.timers.enable({ apis: ['Date'], now: new Date('2026-09-30T14:30:00Z') });
  const { service } = createService({ 'virtualPcImage.findFirst': () => storedImage() });

  await assert.rejects(service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-10-01', revision: 2 }, user, '::1'), BadRequestException);
  await service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-09-30', revision: 2 }, user, '::1');

  // 2026-10-01 00:30 KST: UTC로는 아직 9/30이지만 한국 날짜는 10/1
  t.mock.timers.setTime(new Date('2026-09-30T15:30:00Z').getTime());
  await service.rebuildVirtualPcImage(5, 30, { reason: '사유', rebuiltOn: '2026-10-01', revision: 2 }, user, '::1');
});
