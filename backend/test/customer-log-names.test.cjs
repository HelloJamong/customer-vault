const test = require('node:test');
const assert = require('node:assert/strict');
const { InspectionTargetsService } = require('../src/inspection-targets/inspection-targets.service');

test('inspection target service logs record the customer name instead of the customer ID', async () => {
  const logs = [];
  const target = { id: 3, customerId: 10, targetType: 'VM', customer: { name: '가나다은행' } };
  const prisma = {
    inspectionTarget: {
      create: async () => target,
      findUnique: async () => target,
      update: async () => target,
      delete: async () => {},
    },
  };
  const service = new InspectionTargetsService(prisma, {}, { createServiceLog: async (entry) => { logs.push(entry); } });

  await service.create({ customerId: 10, targetType: 'VM' });
  await service.update(3, { targetType: 'VM' });
  await service.remove(3);

  for (const entry of logs) {
    assert.match(entry.description, /고객사 가나다은행/);
    assert.doesNotMatch(entry.description, /고객사 10/);
  }
  assert.doesNotMatch(logs[1].beforeValue, /"customer"/);
});
