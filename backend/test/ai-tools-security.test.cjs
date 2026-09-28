const test = require('node:test');
const assert = require('node:assert/strict');
require('reflect-metadata');
const { AiIntegrationGuard } = require('../src/ai-tools/ai-integration.guard.ts');
const { AiToolsService } = require('../src/ai-tools/ai-tools.service.ts');

function makeContext(authorization) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ headers: { authorization } }),
    }),
  };
}

test('AI tool API guard accepts only the configured bearer token', () => {
  const guard = new AiIntegrationGuard({ get: () => 'configured-secret' });

  assert.equal(guard.canActivate(makeContext('Bearer configured-secret')), true);
  assert.throws(() => guard.canActivate(makeContext(undefined)), (error) => error.getStatus() === 401);
  assert.throws(() => guard.canActivate(makeContext('Bearer wrong-secret')), (error) => error.getStatus() === 401);
});

test('AI tool API guard denies requests when the integration token is not configured', () => {
  const guard = new AiIntegrationGuard({ get: () => undefined });

  assert.throws(() => guard.canActivate(makeContext('Bearer configured-secret')), (error) => error.getStatus() === 401);
});

test('customer search returns only names and roles needed by the AI tool', async () => {
  let query;
  const auditLogs = [];
  const service = new AiToolsService({
    customer: {
      findMany: async (args) => {
        query = args;
        return [{
          id: 4,
          name: '고객사A',
          contactName: '담당자A',
          contactPosition: '팀장',
          contactDepartment: '정보팀',
          contactNameSub1: null,
          contactPositionSub1: null,
          contactDepartmentSub1: null,
          contactNameSub2: null,
          contactPositionSub2: null,
          contactDepartmentSub2: null,
          contactNameSub3: null,
          contactPositionSub3: null,
          contactDepartmentSub3: null,
          engineer: { name: '기술담당' },
          engineerSub: null,
          sales: { name: '영업담당' },
        }];
      },
    },
  }, { createServiceLog: async (log) => auditLogs.push(log) });

  const results = await service.searchCustomers('고객사A', '127.0.0.1');

  assert.deepEqual(query.where, { name: { contains: '고객사A' } });
  assert.equal(query.take, 10);
  assert.equal(query.select.contactMobile, undefined);
  assert.equal(auditLogs[0].action, 'AI 연동 고객 담당자 조회');
  assert.equal(auditLogs[0].ipAddress, '127.0.0.1');
  assert.equal(auditLogs[0].description.includes('고객사A'), false);
  assert.deepEqual(results.items[0], {
    customerId: 4,
    customerName: '고객사A',
    customerContacts: [{ name: '담당자A', position: '팀장', department: '정보팀' }],
    accountManagers: { engineer: '기술담당', engineerSub: null, sales: '영업담당' },
  });
});

test('unresolved support query limits statuses, selected fields, and result count', async () => {
  let query;
  const auditLogs = [];
  const service = new AiToolsService({
    supportLog: {
      findMany: async (args) => {
        query = args;
        return [{
          id: 8,
          supportDate: new Date('2026-09-27T00:00:00.000Z'),
          category: '오류',
          title: '로그인 오류',
          actionStatus: '진행 중',
          inquiryContent: '로그인 불가 (hong@example.com, 010-1234-5678, 192.168.1.10)',
          actionContent: '원인 분석 중, password:secret-value',
          jiraTicket: 'CV-100',
          customer: { name: '고객사A' },
        }];
      },
    },
  }, { createServiceLog: async (log) => auditLogs.push(log) });

  const results = await service.findUnresolvedSupportLogs({
    customerName: '고객사A',
    supportDateTo: '2026-09-28',
    limit: 25,
  }, '127.0.0.1');

  assert.deepEqual(query.where.actionStatus, { in: ['진행 중', '진행 불가', '보류'] });
  assert.deepEqual(query.where.supportDate, { lte: new Date('2026-09-28T00:00:00.000Z') });
  assert.deepEqual(query.where.customer, { name: { contains: '고객사A' } });
  assert.equal(query.take, 25);
  assert.equal(query.select.userInfo, undefined);
  assert.equal(auditLogs[0].action, 'AI 연동 미조치 지원 이슈 조회');
  assert.equal(auditLogs[0].description.includes('고객사A'), false);
  assert.equal(results.items[0].supportDate, '2026-09-27');
  assert.equal(results.items[0].customerName, '고객사A');
  assert.doesNotMatch(results.items[0].inquiryContent, /hong@example\.com|010-1234-5678|192\.168\.1\.10/);
  assert.doesNotMatch(results.items[0].actionContent, /password:secret-value/);
});
