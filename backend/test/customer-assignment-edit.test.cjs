const test = require('node:test');
const assert = require('node:assert/strict');
const { CustomersService } = require('../src/customers/customers.service');

test('일반 사용자도 정/부 담당 엔지니어와 담당 영업을 변경할 수 있고 변경 이력이 이름으로 남는다', async () => {
  const updates = [];
  const logs = [];
  const users = { 1: '김정담', 2: '이부담', 3: '박영업', 4: '최신규', 5: '정신규', 6: '한신규' };
  const prisma = {
    customer: {
      findUnique: async () => ({
        id: 10,
        name: '가나다은행',
        contractType: '유상',
        engineerId: 1,
        engineerSubId: 2,
        salesId: 3,
        engineer: { name: users[1] },
        engineerSub: { name: users[2] },
        sales: { name: users[3] },
      }),
      update: async ({ data }) => { updates.push(data); return { id: 10, name: '가나다은행' }; },
    },
    user: {
      findMany: async ({ where }) => where.id.in.map((id) => ({ id, name: users[id] })),
    },
  };
  const service = new CustomersService(prisma, { createServiceLog: async (entry) => { logs.push(entry); } }, {});

  await service.update(10, { engineerId: 4, engineerSubId: 5, salesId: 6 }, 99, '::1');

  assert.equal(updates[0].engineerId, 4);
  assert.equal(updates[0].engineerSubId, 5);
  assert.equal(updates[0].salesId, 6);
  assert.match(logs[0].description, /담당 엔지니어: 김정담 → 최신규/);
  assert.match(logs[0].description, /부담당 엔지니어: 이부담 → 정신규/);
  assert.match(logs[0].description, /담당 영업: 박영업 → 한신규/);
});

test('담당자를 비우면 변경 이력에 없음으로 기록된다', async () => {
  const logs = [];
  const prisma = {
    customer: {
      findUnique: async () => ({
        id: 10, name: '가나다은행', contractType: '유상',
        engineerId: 1, engineerSubId: null, salesId: null,
        engineer: { name: '김정담' }, engineerSub: null, sales: null,
      }),
      update: async () => ({ id: 10, name: '가나다은행' }),
    },
    user: { findMany: async () => [] },
  };
  const service = new CustomersService(prisma, { createServiceLog: async (entry) => { logs.push(entry); } }, {});

  await service.update(10, {}, 99, '::1');

  assert.match(logs[0].description, /담당 엔지니어: 김정담 → 없음/);
  assert.doesNotMatch(logs[0].description, /부담당 엔지니어|담당 영업/);
});
