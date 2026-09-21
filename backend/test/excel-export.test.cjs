const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const ExcelJS = require('exceljs');
const { LogsService } = require('../src/logs/logs.service');
const { EXPORT_ACTIONS } = require('../src/logs/dto/log-export.dto');

const frontendRoot = path.resolve(__dirname, '../../frontend/src');

test('server Excel exports preserve Korean text when written and read back', async () => {
  const log = {
    id: 7,
    rowKey: 'service-7',
    timestamp: new Date('2026-09-21T03:04:05Z'),
    username: '홍길동',
    userId: 1,
    logType: '정보',
    action: '고객사 정보 변경',
    description: '서울 고객사의 점검 결과를 저장했습니다.',
    ipAddress: '127.0.0.1',
    beforeValue: '변경 전 값: 한글',
    afterValue: '변경 후 값: 정상',
  };
  const result = {
    data: [log],
    meta: { total: 1, page: 1, limit: 999999, totalPages: 1 },
  };
  const service = new LogsService({});
  service.getSystemLogs = async () => result;
  service.getUploadLogs = async () => result;
  service.getLoginLogs = async () => result;

  const cases = [
    ['exportSystemLogsToExcel', '시스템 이력', 9],
    ['exportUploadLogsToExcel', '업로드 이력', 9],
    ['exportLoginLogsToExcel', '로그인 이력', 7],
  ];

  for (const [method, sheetName, columnCount] of cases) {
    const buffer = await service[method]({});
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const values = workbook.getWorksheet(sheetName).getRow(2).values.slice(1);

    assert.equal(values.length, columnCount);
    assert.equal(values[2], '홍길동');
    assert.equal(values[3], '정보');
    assert.equal(values[4], '고객사 정보 변경');
    assert.equal(values[5], '서울 고객사의 점검 결과를 저장했습니다.');
    if (columnCount === 9) {
      assert.equal(values[7], '변경 전 값: 한글');
      assert.equal(values[8], '변경 후 값: 정상');
    }
  }
});

test('shared browser download helper delays object URL revocation', () => {
  const source = fs.readFileSync(path.join(frontendRoot, 'utils/download.ts'), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  let timeout;
  let appended = false;
  let clicked = false;
  let removed = false;
  let revoked = false;
  const link = {
    href: '',
    download: '',
    click: () => { clicked = true; },
    remove: () => { removed = true; },
  };
  const module = { exports: {} };

  vm.runInNewContext(compiled, {
    module,
    exports: module.exports,
    Blob,
    URL: {
      createObjectURL: () => 'blob:test',
      revokeObjectURL: () => { revoked = true; },
    },
    document: {
      createElement: () => link,
      body: { appendChild: () => { appended = true; } },
    },
    setTimeout: (callback, delay) => { timeout = { callback, delay }; },
  });

  module.exports.downloadBlob('한글', '고객사.xlsx', 'application/test');

  assert.equal(link.href, 'blob:test');
  assert.equal(link.download, '고객사.xlsx');
  assert.equal(appended, true);
  assert.equal(clicked, true);
  assert.equal(removed, true);
  assert.equal(revoked, false);
  assert.equal(timeout.delay, 1000);

  timeout.callback();
  assert.equal(revoked, true);
});

test('browser Excel exporters use the shared safe download helper', () => {
  const files = [
    'components/CustomerSummaryDialog.tsx',
    'pages/CustomerDetailPage.tsx',
    'pages/CustomerSourceManagementDetailPage.tsx',
    'pages/CustomerSupportLogsPage.tsx',
    'pages/CustomersPage.tsx',
  ];

  for (const file of files) {
    const source = fs.readFileSync(path.join(frontendRoot, file), 'utf8');
    assert.match(source, /import \{ downloadBlob \} from ['"]@\/utils\/download['"]/);
    assert.doesNotMatch(source, /revokeObjectURL/);
  }
});

test('virtual PC image Excel export is accepted by the audit action whitelist', () => {
  assert.ok(EXPORT_ACTIONS.includes('가상PC 이미지 정보 엑셀 내보내기'));
});
