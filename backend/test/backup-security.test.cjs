const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
require('reflect-metadata');
const { BackupService } = require('../src/backup/backup.service.ts');
const { BackupFileCryptoService } = require('../src/backup/backup-file-crypto.service.ts');

function makeService(settings) {
  const updates = [];
  const prisma = {
    backupLog: {
      create: async ({ data }) => ({ id: 101, ...data }),
      update: async ({ data }) => {
        updates.push(data);
        return { id: 101, ...data };
      },
    },
  };
  const service = new BackupService(
    prisma,
    { createServiceLog: async () => undefined },
    { getSettings: async () => settings },
    { deleteCronJob: () => undefined, addCronJob: () => undefined },
    { safeDecrypt: (value) => `decrypted:${value}` },
    { encryptFile: async (filePath) => `${filePath}.enc` },
  );
  service.__updates = updates;
  return service;
}

function withFsSpies(fn) {
  const original = {
    mkdirSync: fs.mkdirSync,
    unlinkSync: fs.unlinkSync,
    existsSync: fs.existsSync,
    statSync: fs.statSync,
    readdirSync: fs.readdirSync,
    chmodSync: fs.chmodSync,
  };
  const calls = { mkdirSync: [], unlinkSync: [], existsSync: [], statSync: [], readdirSync: [], chmodSync: [] };

  fs.mkdirSync = (...args) => { calls.mkdirSync.push(args); };
  fs.unlinkSync = (...args) => { calls.unlinkSync.push(args); };
  fs.existsSync = (...args) => { calls.existsSync.push(args); return true; };
  fs.statSync = (...args) => {
    calls.statSync.push(args);
    return { size: 123, mtime: new Date('2026-01-01T00:00:00Z') };
  };
  fs.readdirSync = (...args) => { calls.readdirSync.push(args); return []; };
  fs.chmodSync = (...args) => { calls.chmodSync.push(args); };

  return Promise.resolve()
    .then(() => fn(calls))
    .finally(() => {
      fs.mkdirSync = original.mkdirSync;
      fs.unlinkSync = original.unlinkSync;
      fs.existsSync = original.existsSync;
      fs.statSync = original.statSync;
      fs.readdirSync = original.readdirSync;
      fs.chmodSync = original.chmodSync;
    });
}

test('remote-only backup with blank SFTP host fails before creating or deleting backup files', async () => {
  const service = makeService({
    backupTargetDb: true,
    backupTargetDocs: false,
    backupDestLocal: false,
    backupDestRemote: true,
    sftpHost: '',
    sftpUsername: 'backup-user',
    sftpPassword: 'encrypted-password',
  });

  let backupDatabaseCalled = false;
  service.backupDatabase = async () => { backupDatabaseCalled = true; };
  service.transferToRemote = async () => { throw new Error('transfer should not run'); };

  await withFsSpies(async (calls) => {
    const result = await service.executeBackup(null, 'auto');

    assert.equal(result.status, 'failed');
    assert.match(result.errorMessage, /SFTP host/i);
    assert.equal(backupDatabaseCalled, false);
    assert.equal(calls.mkdirSync.length, 0);
    assert.equal(calls.unlinkSync.length, 0);
  });
});

test('remote backup without SFTP authentication fails before creating backup files', async () => {
  const service = makeService({
    backupTargetDb: true,
    backupTargetDocs: false,
    backupDestLocal: false,
    backupDestRemote: true,
    sftpHost: 'backup.example.com:22',
    sftpUsername: 'backup-user',
    sftpPassword: '',
    sftpKeyPath: '',
  });

  service.backupDatabase = async () => { throw new Error('backup should not run'); };

  await withFsSpies(async (calls) => {
    const result = await service.executeBackup(7, 'manual');

    assert.equal(result.status, 'failed');
    assert.match(result.errorMessage, /SFTP authentication/i);
    assert.equal(calls.mkdirSync.length, 0);
    assert.equal(calls.unlinkSync.length, 0);
  });
});

test('valid remote-only backup still transfers and removes temporary local file after success', async () => {
  const service = makeService({
    backupTargetDb: true,
    backupTargetDocs: false,
    backupDestLocal: false,
    backupDestRemote: true,
    sftpHost: 'backup.example.com:2222',
    sftpUsername: 'backup-user',
    sftpPassword: 'encrypted-password',
  });

  const transferred = [];
  service.backupDatabase = async () => undefined;
  service.transferToRemote = async (localPath, _settings, subDir) => {
    transferred.push({ localPath, subDir });
  };

  await withFsSpies(async (calls) => {
    const result = await service.executeBackup(1, 'manual');

    assert.equal(result.status, 'success');
    assert.equal(transferred.length, 1);
    assert.equal(transferred[0].subDir, 'db-backup');
    assert.match(transferred[0].localPath, /db_.*\.sql\.gz\.enc$/);
    assert.equal(calls.mkdirSync.length, 2);
    assert.equal(calls.unlinkSync.length, 1);
  });
});

test('local-only backup is preserved and retention cleanup runs', async () => {
  const service = makeService({
    backupTargetDb: true,
    backupTargetDocs: false,
    backupDestLocal: true,
    backupDestRemote: false,
    backupRetentionCount: 3,
  });

  let cleanupArgs;
  service.backupDatabase = async () => undefined;
  service.cleanupOldBackups = async (...args) => { cleanupArgs = cleanupArgs || []; cleanupArgs.push(args); };

  await withFsSpies(async (calls) => {
    const result = await service.executeBackup(1, 'manual');

    assert.equal(result.status, 'success');
    assert.equal(calls.unlinkSync.length, 0);
    assert.deepEqual(cleanupArgs, [['db-backup', 3], ['doc-backup', 3]]);
  });
});

test('backup files round-trip through AES-256-GCM and plaintext is removed', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'customer-vault-backup-'));
  const previousKey = process.env.BACKUP_ENCRYPTION_KEY;
  process.env.BACKUP_ENCRYPTION_KEY = '11'.repeat(32);

  try {
    const plaintextPath = path.join(tempDir, 'database.sql.gz');
    const encryptedPath = `${plaintextPath}.enc`;
    const restoredPath = path.join(tempDir, 'restored.sql.gz');
    const content = Buffer.from('customer-vault backup test\n');
    fs.writeFileSync(plaintextPath, content, { mode: 0o600 });

    const service = new BackupFileCryptoService();
    await service.encryptFile(plaintextPath);

    assert.equal(fs.existsSync(plaintextPath), false);
    assert.equal(fs.statSync(encryptedPath).mode & 0o777, 0o600);

    await service.decryptFile(encryptedPath, restoredPath);
    assert.deepEqual(fs.readFileSync(restoredPath), content);
    assert.equal(fs.statSync(restoredPath).mode & 0o777, 0o600);

    const tamperedPath = path.join(tempDir, 'tampered.enc');
    const tampered = fs.readFileSync(encryptedPath);
    tampered[tampered.length - 1] ^= 0xff;
    fs.writeFileSync(tamperedPath, tampered, { mode: 0o600 });
    await assert.rejects(() => service.decryptFile(tamperedPath), /unable to authenticate|Unsupported state|bad decrypt/i);
  } finally {
    if (previousKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
    else process.env.BACKUP_ENCRYPTION_KEY = previousKey;
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test('backup encryption rejects missing keys before reading input', async () => {
  const previousKey = process.env.BACKUP_ENCRYPTION_KEY;
  delete process.env.BACKUP_ENCRYPTION_KEY;
  try {
    const service = new BackupFileCryptoService();
    await assert.rejects(() => service.encryptFile('/does/not/exist'), /BACKUP_ENCRYPTION_KEY/);
  } finally {
    if (previousKey === undefined) delete process.env.BACKUP_ENCRYPTION_KEY;
    else process.env.BACKUP_ENCRYPTION_KEY = previousKey;
  }
});
