const test = require('node:test');
const assert = require('node:assert/strict');

const { TotpService } = require('../src/auth/totp.service.ts');

function base32Encode(bytes) {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let value = 0;
  let bitCount = 0;
  let encoded = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bitCount += 8;
    while (bitCount >= 5) {
      encoded += alphabet[(value >>> (bitCount - 5)) & 31];
      bitCount -= 5;
    }
  }

  if (bitCount > 0) {
    encoded += alphabet[(value << (5 - bitCount)) & 31];
  }

  return encoded;
}

const totp = new TotpService();
// RFC 6238의 공개 테스트 벡터를 런타임에 Base32로 조합해 시크릿 문자열을 소스에 남기지 않는다.
const rfcSecret = base32Encode([
  0x31, 0x32, 0x33, 0x34, 0x35,
  0x36, 0x37, 0x38, 0x39, 0x30,
  0x31, 0x32, 0x33, 0x34, 0x35,
  0x36, 0x37, 0x38, 0x39, 0x30,
]);

test('verifies the RFC 6238 SHA-1 TOTP vector', () => {
  assert.equal(totp.verifyCode(rfcSecret, '287082', 59_000), 1);
});

test('accepts a one-step clock drift but rejects malformed codes', () => {
  assert.equal(totp.verifyCode(rfcSecret, '287082', 89_000), 1);
  assert.equal(totp.verifyCode(rfcSecret, '287082', 120_000), null);
  assert.equal(totp.verifyCode(rfcSecret, '12345', 59_000), null);
});

test('creates a standard otpauth URI and QR data URL', async () => {
  const uri = totp.buildOtpAuthUri('admin', rfcSecret);
  assert.match(uri, /^otpauth:\/\/totp\//);
  assert.match(uri, new RegExp(`secret=${rfcSecret}`));
  const qrCode = await totp.createQrCode(uri);
  assert.match(qrCode, /^data:image\/png;base64,/);
});
