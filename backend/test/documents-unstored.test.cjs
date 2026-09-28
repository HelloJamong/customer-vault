const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DocumentsService } = require('../src/documents/documents.service');
const { CustomersService } = require('../src/customers/customers.service');

function serviceFixture() {
  let createdDocument;
  let customerUpdate;
  let serviceLog;
  const inspectionDate = new Date('2026-09-15T00:00:00.000Z');
  const service = new DocumentsService({
    customer: {
      findUnique: async () => ({ id: 1, name: '고객사', lastInspectionDate: null }),
      update: async (args) => { customerUpdate = args; },
    },
    inspectionTarget: {
      findFirst: async () => ({ id: 2, productName: '제품', customName: null, targetType: '서버' }),
    },
    document: {
      create: async ({ data }) => {
        createdDocument = data;
        return { id: 10, ...data };
      },
    },
  }, {
    createServiceLog: async (entry) => { serviceLog = entry; },
  }, {});

  return {
    service,
    getCreatedDocument: () => createdDocument,
    getCustomerUpdate: () => customerUpdate,
    getServiceLog: () => serviceLog,
    inspectionDate,
  };
}

test('registering an unstored inspection requires a reason', async () => {
  const { service } = serviceFixture();
  await assert.rejects(
    service.createNotStored({
      customerId: 1,
      inspectionTargetId: 2,
      uploadedBy: 3,
      inspectionDate: '2026-09-15',
      inspectionType: '방문',
      reason: '   ',
    }),
    /미보관 사유/,
  );
});

test('registering an unstored inspection records completion metadata without a file', async () => {
  const fixture = serviceFixture();
  const result = await fixture.service.createNotStored({
    customerId: 1,
    inspectionTargetId: 2,
    uploadedBy: 3,
    inspectionDate: '2026-09-15',
    inspectionType: '방문',
    reason: ' 고객사 정책상 점검서를 보관하지 않음 ',
  });

  assert.equal(fixture.getCreatedDocument().filename, null);
  assert.equal(fixture.getCreatedDocument().filepath, null);
  assert.equal(fixture.getCreatedDocument().isReportStored, false);
  assert.equal(fixture.getCreatedDocument().reportNotStoredReason, '고객사 정책상 점검서를 보관하지 않음');
  assert.equal(fixture.getCustomerUpdate().data.lastInspectionDate.getTime(), fixture.inspectionDate.getTime());
  assert.match(fixture.getServiceLog().description, /점검서 미보관 사유/);
  assert.equal(result.message, '점검서 미보관으로 점검 완료가 등록되었습니다.');
});

test('unstored inspection records count toward inspection completion', () => {
  const service = new CustomersService({}, {}, {});
  const status = service.getInspectionStatus({
    contractType: '유상',
    inspectionCycleType: '매월',
    inspectionTargets: [{ id: 2 }],
    documents: [{
      inspectionTargetId: 2,
      inspectionDate: new Date(),
      isReportStored: false,
      reportNotStoredReason: '고객사 정책상 보관하지 않음',
    }],
  });

  assert.equal(status, '완료');
});
