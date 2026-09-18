const assert = require('node:assert/strict');
const net = require('node:net');
const { test } = require('node:test');
const {
  FileSecurityService,
  validateUploadSignature,
} = require('../src/common/file-security/file-security.service.ts');

test('PDF signature must match the .pdf extension', () => {
  assert.equal(validateUploadSignature('report.pdf', Buffer.from('%PDF-1.7')), 'pdf');
  assert.throws(
    () => validateUploadSignature('report.pdf', Buffer.from('MZ-not-a-pdf')),
    /PDF 형식과 일치하지 않습니다/,
  );
});

test('Office/HWP legacy and OOXML signatures are validated', () => {
  const ole = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  const zip = (entry) => Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from(entry)]);

  assert.equal(validateUploadSignature('report.doc', ole), 'doc');
  assert.equal(validateUploadSignature('report.hwp', ole), 'hwp');
  assert.equal(validateUploadSignature('report.ppt', ole), 'ppt');
  assert.equal(validateUploadSignature('report.docx', zip('word/document.xml')), 'docx');
  assert.throws(
    () => validateUploadSignature('report.hwpw', zip('contents/content.hpf')),
    /허용되지 않은 파일 형식입니다/,
  );
  assert.equal(validateUploadSignature('report.hwpx', zip('contents/content.hpf')), 'hwpx');
  assert.equal(validateUploadSignature('report.pptx', zip('ppt/presentation.xml')), 'pptx');
  assert.throws(
    () => validateUploadSignature('report.docx', ole),
    /선택한 문서 형식과 일치하지 않습니다/,
  );
});

test('ClamAV clean response is accepted through the INSTREAM protocol', async (t) => {
  const server = net.createServer((socket) => {
    let received = Buffer.alloc(0);
    socket.on('data', (chunk) => {
      received = Buffer.concat([received, chunk]);
      if (received.includes(Buffer.alloc(4))) {
        socket.end('stream: OK\n');
      }
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());

  const previous = {
    enabled: process.env.CLAMAV_ENABLED,
    host: process.env.CLAMAV_HOST,
    port: process.env.CLAMAV_PORT,
  };
  process.env.CLAMAV_ENABLED = 'true';
  process.env.CLAMAV_HOST = '127.0.0.1';
  process.env.CLAMAV_PORT = String(server.address().port);

  try {
    const service = new FileSecurityService();
    await service.inspectBuffer('report.pdf', Buffer.from('%PDF-clean'));
  } finally {
    if (previous.enabled === undefined) delete process.env.CLAMAV_ENABLED;
    else process.env.CLAMAV_ENABLED = previous.enabled;
    if (previous.host === undefined) delete process.env.CLAMAV_HOST;
    else process.env.CLAMAV_HOST = previous.host;
    if (previous.port === undefined) delete process.env.CLAMAV_PORT;
    else process.env.CLAMAV_PORT = previous.port;
  }
});
