const test = require('node:test');
const assert = require('node:assert/strict');
process.env.ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'a'.repeat(64);
const { CryptoService } = require('../src/common/crypto/crypto.service.ts');

const crypto = new CryptoService();

test('encrypt/decrypt round-trips with AES-256-GCM (v2)', () => {
  const enc = crypto.encrypt('hunter2');
  assert.ok(enc.startsWith('v2:'));
  assert.equal(crypto.decrypt(enc), 'hunter2');
});

test('decrypts legacy AES-256-CBC values (no v2 prefix)', () => {
  const nodeCrypto = require('crypto');
  const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  const iv = nodeCrypto.randomBytes(16);
  const cipher = nodeCrypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update('legacy-secret'), cipher.final()]);
  const legacyValue = iv.toString('hex') + ':' + encrypted.toString('hex');

  assert.equal(crypto.safeDecrypt(legacyValue), 'legacy-secret');
});

test('safeDecrypt returns null instead of throwing on a tampered/corrupt value', () => {
  const enc = crypto.encrypt('hunter2');
  const tampered = enc.slice(0, -2) + 'ff'; // flip the tail of the ciphertext
  assert.equal(crypto.safeDecrypt(tampered), null);
});

test('safeDecrypt returns plaintext as-is when value is not encrypted', () => {
  assert.equal(crypto.safeDecrypt('plain-value'), 'plain-value');
  assert.equal(crypto.safeDecrypt(null), null);
  assert.equal(crypto.safeDecrypt(''), null);
});
