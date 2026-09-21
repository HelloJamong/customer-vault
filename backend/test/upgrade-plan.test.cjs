const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { BadRequestException } = require('@nestjs/common');
const { CustomersService } = require('../src/customers/customers.service');

const createService = (prisma = {}) => new CustomersService(prisma, {}, {});

test('upgrade plan response exposes reviewer and verifier display names instead of stored login identifiers', async () => {
  const updatedAt = new Date('2026-09-21T01:02:03Z');
  const prisma = {
    upgradePlan: {
      findUnique: async () => ({
        id: 3,
        customerId: 10,
        status: '예정',
        currentVersion: '4.2',
        targetVersion: '6.1',
        scheduleEstimate: '2026-10',
        createdAt: new Date('2026-09-01T00:00:00Z'),
        updatedAt,
        considerations: [{
          id: 4,
          category: '클라이언트',
          feature: '초기 패스워드',
          description: null,
          checked: true,
          note: null,
          checkedBy: { id: 1, name: '김검토' },
          checkedByName: 'reviewer-login-id',
          checkedAt: new Date(),
          verified: true,
          verifiedBy: { id: 2, name: '이검증' },
          verifiedByName: 'verifier-login-id',
          verifiedAt: new Date(),
          displayOrder: 0,
        }],
      }),
    },
  };

  const result = await createService(prisma).getUpgradePlan(10);
  const item = result.considerations[0];

  assert.equal(item.checkedBy.name, '김검토');
  assert.equal(item.checkedByName, '김검토');
  assert.equal(item.verifiedBy.name, '이검증');
  assert.equal(item.verifiedByName, '이검증');
  assert.equal(result.updatedAt, updatedAt);
});

test('upgrade consideration verification records a different user and preserves the reviewer', () => {
  const service = createService();
  const previous = new Map([[4, {
    category: '클라이언트',
    feature: '초기 패스워드',
    description: null,
    checked: true,
    checkedByUserId: 1,
    checkedByName: '김검토',
    checkedAt: new Date('2026-09-20T00:00:00Z'),
    verified: false,
    verifiedByUserId: null,
    verifiedByName: null,
    verifiedAt: null,
  }]]);

  const result = service.buildConsiderationCreateData({
    id: 4,
    category: '클라이언트',
    feature: '초기 패스워드',
    checked: true,
    verified: true,
  }, 2, '이검증', 0, previous);

  assert.equal(result.checkedByUserId, 1);
  assert.equal(result.checkedByName, '김검토');
  assert.equal(result.verifiedByUserId, 2);
  assert.equal(result.verifiedByName, '이검증');
  assert.ok(result.verifiedAt instanceof Date);
});

test('upgrade consideration rejects verification before review or by the same reviewer', () => {
  const service = createService();

  assert.throws(() => service.buildConsiderationCreateData({
    category: '클라이언트',
    feature: '초기 패스워드',
    checked: false,
    verified: true,
  }, 1, '김검토', 0), BadRequestException);

  const previous = new Map([[4, {
    category: '클라이언트',
    feature: '초기 패스워드',
    description: null,
    checked: true,
    checkedByUserId: 1,
    checkedByName: '김검토',
    checkedAt: new Date(),
    verified: false,
    verifiedByUserId: null,
    verifiedByName: null,
    verifiedAt: null,
  }]]);

  assert.throws(() => service.buildConsiderationCreateData({
    id: 4,
    category: '클라이언트',
    feature: '초기 패스워드',
    checked: true,
    verified: true,
  }, 1, '김검토', 0, previous), BadRequestException);
});

test('changing reviewed consideration content clears reviewer and verifier state', () => {
  const service = createService();
  const previous = new Map([[4, {
    category: '클라이언트',
    feature: '초기 패스워드',
    description: '기존 설명',
    checked: true,
    checkedByUserId: 1,
    checkedByName: '김검토',
    checkedAt: new Date(),
    verified: true,
    verifiedByUserId: 2,
    verifiedByName: '이검증',
    verifiedAt: new Date(),
  }]]);

  const result = service.buildConsiderationCreateData({
    id: 4,
    category: '클라이언트',
    feature: '초기 패스워드',
    description: '변경된 설명',
    checked: true,
    verified: true,
  }, 3, '박수정', 0, previous);

  assert.equal(result.checked, false);
  assert.equal(result.checkedByUserId, null);
  assert.equal(result.checkedByName, null);
  assert.equal(result.verified, false);
  assert.equal(result.verifiedByUserId, null);
  assert.equal(result.verifiedByName, null);
});

test('upgrade plan default template contains the requested client and management server items', () => {
  const templatePath = path.resolve(__dirname, '../../frontend/src/utils/upgrade-plan-template.ts');
  const source = fs.readFileSync(templatePath, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(compiled, { module, exports: module.exports });

  const items = module.exports.UPGRADE_PLAN_DEFAULT_CONSIDERATIONS;
  assert.equal(items.length, 16);
  assert.deepEqual(
    Array.from(items.filter((item) => item.category === '클라이언트'), (item) => item.feature),
    ['초기 패스워드', '가상PC 이미지', '가상PC IP주소 할당', '화면 캡쳐 방지/원격 예외처리', '가상PC 네트워크 접속', '클라이언트 로그인', '정책템플릿 기능'],
  );
  assert.deepEqual(
    Array.from(items.filter((item) => item.category === '관리서버'), (item) => item.feature),
    ['패스워드 복잡성', 'IP 할당 정책', '계정연동', '로그인 인증 방식', '화면 캡처 방지 정책', '원격 예외처리', '관리웹 접근 IP 제어', '라이선스', '계정연동 라이선스 할당 여부'],
  );
});
