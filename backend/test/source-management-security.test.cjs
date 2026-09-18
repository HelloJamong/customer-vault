const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { Role } = require('../src/common/enums/role.enum.ts');
const { ROLES_KEY } = require('../src/common/decorators/roles.decorator.ts');
const { CustomersController } = require('../src/customers/customers.controller.ts');
const { CustomersService } = require('../src/customers/customers.service.ts');

test('source-management reveal is available to all internal roles', () => {
  const roles = Reflect.getMetadata(ROLES_KEY, CustomersController.prototype.revealSourceManagement);
  assert.deepEqual(roles, [Role.SUPER_ADMIN, Role.ADMIN, Role.USER]);
});

test('source-management reveal records an audit log without secret values', async () => {
  let savedLog;
  const service = new CustomersService(
    {
      customer: {
        findUnique: async () => ({ name: '고객사A' }),
      },
      sourceManagement: {
        findUnique: async () => null,
      },
    },
    {
      createServiceLog: async (log) => {
        savedLog = log;
      },
    },
    {},
  );

  const result = await service.revealSourceManagement(7, 2, '127.0.0.1');

  assert.equal(result.customerId, 7);
  assert.equal(savedLog.userId, 2);
  assert.equal(savedLog.action, '소스 관리 민감정보 열람');
  assert.match(savedLog.description, /고객사A/);
  assert.equal(savedLog.ipAddress, '127.0.0.1');
  assert.doesNotMatch(savedLog.description, /password|비밀번호|secret/i);
});
