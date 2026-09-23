const test = require('node:test');
const assert = require('node:assert/strict');
const { BadRequestException } = require('@nestjs/common');
const { CustomersService } = require('../src/customers/customers.service');
const { DashboardService } = require('../src/dashboard/dashboard.service');

test('verifier must be an active 기술팀 user, but an already assigned verifier can be kept', async () => {
  const queries = [];
  const technicians = new Set([7]);
  const prisma = {
    user: {
      count: async ({ where }) => {
        queries.push(where);
        assert.equal(where.department, '기술팀');
        assert.equal(where.isActive, true);
        return where.id.in.filter((id) => technicians.has(id)).length;
      },
    },
  };
  const service = new CustomersService(prisma, {}, {});

  await service.assertVerifierCandidates([7, null, undefined, 7]);
  await assert.rejects(service.assertVerifierCandidates([7, 8]), BadRequestException);
  await service.assertVerifierCandidates([8], [8]);
  assert.deepEqual(queries.map((where) => where.id.in), [[7], [7, 8]]);
});

test('pending verifications list only the current verifier checklist items with customer names', async () => {
  const wheres = [];
  const prisma = {
    virtualPcImage: {
      findMany: async ({ where }) => {
        wheres.push(where);
        return [{
          name: 'Win11 표준',
          sourceManagement: { customer: { id: 3, name: '가나다은행' } },
          checklistItems: [{ itemKey: 'boot_network', checkedByName: '김검토' }],
        }];
      },
    },
    upgradePlan: {
      findMany: async ({ where }) => {
        wheres.push(where);
        return [{
          customer: { id: 4, name: '라마바증권' },
          considerations: [{ category: '클라이언트', feature: '초기 패스워드', checkedByName: '이검토' }],
        }];
      },
    },
  };

  const result = await new DashboardService(prisma).getPendingVerifications(9);

  assert.ok(wheres.every((where) => where.verifierUserId === 9));
  assert.deepEqual(result.map((group) => [group.type, group.customerName]), [
    ['virtualPcChecklist', '가나다은행'],
    ['upgradePlan', '라마바증권'],
  ]);
  assert.equal(result[0].documentName, 'Win11 표준');
  assert.equal(result[1].items[0].key, '클라이언트 - 초기 패스워드');
});
