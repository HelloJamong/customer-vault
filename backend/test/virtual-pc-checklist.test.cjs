const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { BadRequestException } = require('@nestjs/common');
const { CustomersService } = require('../src/customers/customers.service');

const createImage = (checklistItem) => ({
  name: '표준 이미지',
  osName: 'Windows',
  osEdition: 'Enterprise',
  osRelease: '11',
  cDiskCapacity: 100,
  licenseStatus: '진행완료',
  checklistItems: [checklistItem],
});

test('virtual PC checklist verification preserves reviewer and records a different verifier', () => {
  const service = new CustomersService({}, {}, {});
  const reviewedAt = new Date('2026-09-20T00:00:00Z');
  const previous = new Map([['boot_server_install', {
    checked: true,
    checkedByUserId: 1,
    checkedByName: '김검토',
    checkedAt: reviewedAt,
    verified: false,
    verifiedByUserId: null,
    verifiedByName: null,
    verifiedAt: null,
  }]]);

  const result = service.buildVirtualPcImageCreateData(
    createImage({ itemKey: 'boot_server_install', checked: true, verified: true }),
    2,
    '이검증',
    previous,
  ).checklistItems.create[0];

  assert.equal(result.checkedByUserId, 1);
  assert.equal(result.checkedByName, '김검토');
  assert.equal(result.checkedAt, reviewedAt);
  assert.equal(result.verifiedByUserId, 2);
  assert.equal(result.verifiedByName, '이검증');
  assert.ok(result.verifiedAt instanceof Date);
});

test('virtual PC checklist rejects verification before review or by the same reviewer', () => {
  const service = new CustomersService({}, {}, {});

  assert.throws(() => service.buildVirtualPcImageCreateData(
    createImage({ itemKey: 'boot_server_install', checked: false, verified: true }),
    1,
    '김검토',
  ), BadRequestException);

  assert.throws(() => service.buildVirtualPcImageCreateData(
    createImage({ itemKey: 'boot_server_install', checked: true, verified: true }),
    1,
    '김검토',
  ), BadRequestException);
});

test('edit screens show only review and verification checkboxes while detail screens show saved names', () => {
  const frontendRoot = path.resolve(__dirname, '../../frontend/src/pages');
  const upgradeEdit = fs.readFileSync(path.join(frontendRoot, 'CustomerUpgradePlanEditPage.tsx'), 'utf8');
  const upgradeDetail = fs.readFileSync(path.join(frontendRoot, 'CustomerUpgradePlanPage.tsx'), 'utf8');
  const sourceEdit = fs.readFileSync(path.join(frontendRoot, 'CustomerSourceManagementEditPage.tsx'), 'utf8');
  const sourceDetail = fs.readFileSync(path.join(frontendRoot, 'CustomerSourceManagementDetailPage.tsx'), 'utf8');

  assert.doesNotMatch(upgradeEdit, /<TableCell[^>]*>검토자<\/TableCell>/);
  assert.doesNotMatch(upgradeEdit, /<TableCell[^>]*>검증자<\/TableCell>/);
  assert.match(upgradeEdit, /minWidth: 360/);
  assert.match(upgradeDetail, /최종 수정:/);

  assert.match(sourceEdit, /label="검토"/);
  assert.match(sourceEdit, /label="검증"/);
  assert.doesNotMatch(sourceEdit, /점검자:/);
  assert.match(sourceDetail, /<TableCell>검토자<\/TableCell>/);
  assert.match(sourceDetail, /<TableCell>검증자<\/TableCell>/);
});
