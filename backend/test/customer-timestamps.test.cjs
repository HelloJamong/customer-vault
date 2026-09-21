const test = require('node:test');
const assert = require('node:assert/strict');
const { CustomersService } = require('../src/customers/customers.service');

test('source management response includes source and virtual PC image timestamps', async () => {
  const sourceCreatedAt = new Date('2026-09-01T01:00:00Z');
  const sourceUpdatedAt = new Date('2026-09-20T02:00:00Z');
  const imageCreatedAt = new Date('2026-09-02T03:00:00Z');
  const imageUpdatedAt = new Date('2026-09-19T04:00:00Z');
  const prisma = {
    sourceManagement: {
      findUnique: async () => ({
        id: 1,
        customerId: 10,
        createdAt: sourceCreatedAt,
        updatedAt: sourceUpdatedAt,
        clientVersion: null,
        clientCustomInfo: null,
        virtualPcOsVersion: null,
        virtualPcBuildVersion: null,
        virtualPcGuestAddition: null,
        virtualPcImageInfo: null,
        adminWebVersion: '6.1',
        adminWebVersionDetail: null,
        adminWebReleaseDate: null,
        adminWebCustomInfo: null,
        redundancyType: '단일 구성',
        hrIntegrationEnabled: false,
        hrDbType: null,
        hrDbVersion: null,
        hrDbName: null,
        hrDbHost: null,
        hrDbPort: null,
        hrDbUsername: null,
        hrDbPassword: null,
        hrUserSyncQuery: null,
        hrDepartmentSyncQuery: null,
        servers: [],
        accessInfo: [],
        hrMappings: [],
        virtualPcImages: [{
          id: 2,
          name: '표준 이미지',
          createdAt: imageCreatedAt,
          updatedAt: imageUpdatedAt,
          osName: 'Windows',
          osEdition: 'Enterprise',
          osRelease: '11',
          cDiskCapacity: 100,
          dDiskCapacity: null,
          licenseStatus: '완료',
          licenseNote: null,
          hashValue: null,
          installedPrograms: [],
          checklistItems: [],
        }],
      }),
    },
  };
  const service = new CustomersService(prisma, {}, { safeDecrypt: (value) => value });

  const result = await service.getSourceManagement(10);

  assert.equal(result.createdAt, sourceCreatedAt);
  assert.equal(result.updatedAt, sourceUpdatedAt);
  assert.equal(result.virtualPcImages[0].createdAt, imageCreatedAt);
  assert.equal(result.virtualPcImages[0].updatedAt, imageUpdatedAt);
});

test('virtual PC image recreation preserves its original creation timestamp', () => {
  const service = new CustomersService({}, {}, {});
  const originalCreatedAt = new Date('2026-08-01T00:00:00Z');

  const data = service.buildVirtualPcImageCreateData({
    name: '표준 이미지',
    osName: 'Windows',
    osEdition: 'Enterprise',
    osRelease: '11',
    cDiskCapacity: 100,
    licenseStatus: '진행완료',
  }, 1, '김작성', undefined, originalCreatedAt);

  assert.equal(data.createdAt, originalCreatedAt);
});
