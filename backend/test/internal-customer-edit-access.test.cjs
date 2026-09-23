const test = require('node:test');
const assert = require('node:assert/strict');
const { CustomersController } = require('../src/customers/customers.controller.ts');
const { InspectionTargetsController } = require('../src/inspection-targets/inspection-targets.controller.ts');
const { InspectionTargetsService } = require('../src/inspection-targets/inspection-targets.service.ts');
const { SupportLogsController } = require('../src/support-logs/support-logs.controller.ts');
const { SupportLogsService } = require('../src/support-logs/support-logs.service.ts');

const request = {
  user: { id: 99, role: 'user' },
  ip: '127.0.0.1',
};

test('unassigned internal users can update customer maintenance information', async () => {
  let updateArgs;
  const controller = new CustomersController({
    assertCustomerAssignment: async () => {
      throw new Error('assignment check must not run');
    },
    update: async (...args) => {
      updateArgs = args;
      return { message: 'updated' };
    },
  });

  const result = await controller.update(7, { notes: 'updated' }, request);

  assert.equal(result.message, 'updated');
  assert.deepEqual(updateArgs, [7, { notes: 'updated' }, 99, '127.0.0.1', 'user']);
});

test('unassigned internal users can read and save source-management edits', async () => {
  const calls = [];
  const controller = new CustomersController({
    assertCustomerAssignment: async () => {
      throw new Error('assignment check must not run');
    },
    getSourceManagementForEdit: async (...args) => {
      calls.push(['read', ...args]);
      return { id: 1 };
    },
    createSourceManagement: async (...args) => {
      calls.push(['create', ...args]);
      return { id: 1 };
    },
    updateSourceManagement: async (...args) => {
      calls.push(['update', ...args]);
      return { id: 1 };
    },
  });

  await controller.getSourceManagementForEdit(7, request);
  await controller.createSourceManagement(7, { clientVersion: '1.0' }, request);
  await controller.updateSourceManagement(7, { clientVersion: '1.1' }, request);

  assert.deepEqual(calls, [
    ['read', 7, 99, '127.0.0.1'],
    ['create', 7, { clientVersion: '1.0' }, 99, '127.0.0.1'],
    ['update', 7, { clientVersion: '1.1' }, 99, '127.0.0.1'],
  ]);
});

test('unassigned internal users can create and update upgrade plans', async () => {
  const calls = [];
  const controller = new CustomersController({
    assertCustomerAssignment: async () => {
      throw new Error('assignment check must not run');
    },
    createUpgradePlan: async (...args) => {
      calls.push(['create', ...args]);
      return { id: 1 };
    },
    updateUpgradePlan: async (...args) => {
      calls.push(['update', ...args]);
      return { id: 1 };
    },
  });

  await controller.createUpgradePlan(7, { status: '예정' }, request);
  await controller.updateUpgradePlan(7, { status: '진행중' }, request);

  assert.deepEqual(calls, [
    ['create', 7, { status: '예정' }, 99, '127.0.0.1'],
    ['update', 7, { status: '진행중' }, 99, '127.0.0.1'],
  ]);
});

test('unassigned internal users can manage maintenance inspection targets', async () => {
  const calls = [];
  const controller = new InspectionTargetsController({
    assertCanManageCustomer: async () => {
      throw new Error('assignment check must not run');
    },
    assertCanManageTarget: async () => {
      throw new Error('assignment check must not run');
    },
    create: async (...args) => {
      calls.push(['create', ...args]);
      return { id: 1 };
    },
    update: async (...args) => {
      calls.push(['update', ...args]);
      return { message: 'updated' };
    },
    remove: async (...args) => {
      calls.push(['remove', ...args]);
      return { message: 'removed' };
    },
  });

  await controller.create({ customerId: 7, targetType: '정기점검' }, request);
  await controller.update(3, { productName: '제품' }, request);
  await controller.remove(3, request);

  assert.deepEqual(calls, [
    ['create', { customerId: 7, targetType: '정기점검' }, { userId: 99, ipAddress: '127.0.0.1' }],
    ['update', 3, { productName: '제품' }, { userId: 99, ipAddress: '127.0.0.1' }],
    ['remove', 3, { userId: 99, ipAddress: '127.0.0.1' }],
  ]);
});

test('maintenance inspection target changes retain actor and before/after audit history', async () => {
  const savedLogs = [];
  const existing = { id: 3, customerId: 7, targetType: '정기점검', productName: '기존 제품' };
  const customer = { name: '테스트 고객사' };
  const service = new InspectionTargetsService(
    {
      inspectionTarget: {
        create: async ({ data }) => ({ id: 3, ...data, customer }),
        findUnique: async () => ({ ...existing, customer }),
        update: async ({ data }) => ({ ...existing, ...data }),
        delete: async () => existing,
      },
    },
    {},
    {
      createServiceLog: async (entry) => {
        savedLogs.push(entry);
      },
    },
  );
  const audit = { userId: 99, ipAddress: '127.0.0.1' };

  await service.create({ customerId: 7, targetType: '정기점검' }, audit);
  await service.update(3, { productName: '변경 제품' }, audit);
  await service.remove(3, audit);

  assert.deepEqual(savedLogs.map((entry) => entry.action), [
    '점검 대상 추가',
    '점검 대상 수정',
    '점검 대상 삭제',
  ]);
  assert.ok(savedLogs.every((entry) => entry.userId === 99 && entry.ipAddress === '127.0.0.1'));
  assert.equal(JSON.parse(savedLogs[1].beforeValue).productName, '기존 제품');
  assert.equal(JSON.parse(savedLogs[1].afterValue).productName, '변경 제품');
  assert.equal(JSON.parse(savedLogs[2].beforeValue).id, 3);
});

test('unassigned internal users can create, update, and delete support logs', async () => {
  const calls = [];
  const controller = new SupportLogsController({
    create: async (...args) => {
      calls.push(['create', ...args]);
      return { id: 4 };
    },
    update: async (...args) => {
      calls.push(['update', ...args]);
      return { id: 4 };
    },
    remove: async (...args) => {
      calls.push(['remove', ...args]);
      return { message: 'removed' };
    },
  });
  const createDto = { customerId: 7, supportDate: '2026-09-22', title: '지원' };

  await controller.create(createDto, request);
  await controller.update(4, { title: '후속 지원' }, request);
  await controller.remove(4, request);

  assert.deepEqual(calls, [
    ['create', createDto, 99, '127.0.0.1'],
    ['update', 4, { title: '후속 지원' }, 99, '127.0.0.1'],
    ['remove', 4, 99, '127.0.0.1'],
  ]);
});

test('support log changes keep existing audit history without consulting customer assignment', async () => {
  const savedLogs = [];
  const existing = {
    id: 4,
    customerId: 7,
    supportDate: new Date('2026-09-22'),
    title: '지원',
    customer: { id: 7, name: '테스트' },
    creator: { id: 99, name: '테스트 사용자', username: 'test' },
  };
  const service = new SupportLogsService(
    {
      customer: {
        findFirst: async () => {
          throw new Error('assignment lookup must not run');
        },
      },
      supportLog: {
        create: async () => existing,
        findUnique: async () => existing,
        update: async ({ data }) => ({ ...existing, ...data, title: data.title ?? existing.title }),
        delete: async () => existing,
      },
    },
    {
      createServiceLog: async (entry) => {
        savedLogs.push(entry);
      },
    },
  );

  await service.create({ customerId: 7, supportDate: '2026-09-22', title: '지원' }, 99, '127.0.0.1');
  await service.update(4, { title: '후속 지원' }, 99, '127.0.0.1');
  await service.remove(4, 99, '127.0.0.1');

  assert.deepEqual(savedLogs.map((entry) => entry.action), [
    '지원 로그 생성',
    '지원 로그 수정',
    '지원 로그 삭제',
  ]);
  assert.ok(savedLogs.every((entry) => entry.userId === 99 && entry.ipAddress === '127.0.0.1'));
  assert.equal(JSON.parse(savedLogs[1].beforeValue).title, '지원');
  assert.equal(JSON.parse(savedLogs[1].afterValue).title, '후속 지원');
});
