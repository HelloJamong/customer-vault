const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcrypt');
const crypto = require('node:crypto');
const { getInitialAdminPassword } = require('../src/common/config/initial-password.ts');
const { PrismaService } = require('../src/common/prisma/prisma.service.ts');

test('bootstrap password is required when the database is empty', () => {
  const previous = process.env.INITIAL_ADMIN_PASSWORD;
  delete process.env.INITIAL_ADMIN_PASSWORD;

  try {
    assert.throws(() => getInitialAdminPassword(), /INITIAL_ADMIN_PASSWORD/);
  } finally {
    if (previous === undefined) delete process.env.INITIAL_ADMIN_PASSWORD;
    else process.env.INITIAL_ADMIN_PASSWORD = previous;
  }
});

test('first bootstrap uses the explicit password and marks admin for first login', async () => {
  const previous = process.env.INITIAL_ADMIN_PASSWORD;
  const explicitBootstrapPassword = `T-${crypto.randomBytes(18).toString('hex')}-9!`;
  process.env.INITIAL_ADMIN_PASSWORD = explicitBootstrapPassword;
  let createdSettings;
  let createdUser;

  const service = Object.create(PrismaService.prototype);
  service.user = {
    count: async () => 0,
    create: async ({ data }) => {
      createdUser = data;
    },
  };
  service.systemSettings = {
    findFirst: async () => null,
    create: async ({ data }) => {
      createdSettings = data;
    },
  };

  try {
    await service.ensureDefaultAdmin();
    assert.deepEqual(createdSettings, { defaultPassword: explicitBootstrapPassword });
    assert.equal(createdUser.username, 'admin');
    assert.equal(createdUser.isFirstLogin, true);
    assert.equal(await bcrypt.compare(explicitBootstrapPassword, createdUser.passwordHash), true);
  } finally {
    if (previous === undefined) delete process.env.INITIAL_ADMIN_PASSWORD;
    else process.env.INITIAL_ADMIN_PASSWORD = previous;
  }
});

test('existing databases do not recreate or reset the admin account', async () => {
  const previous = process.env.INITIAL_ADMIN_PASSWORD;
  const configuredPassword = `C-${crypto.randomBytes(12).toString('hex')}`;
  delete process.env.INITIAL_ADMIN_PASSWORD;
  let created = false;

  const service = Object.create(PrismaService.prototype);
  service.user = {
    count: async () => 1,
    create: async () => {
      created = true;
    },
  };
  service.systemSettings = {
    findFirst: async () => ({ id: 1, defaultPassword: configuredPassword }),
    create: async () => {
      created = true;
    },
  };

  try {
    await service.ensureDefaultAdmin();
    assert.equal(created, false);
  } finally {
    if (previous === undefined) delete process.env.INITIAL_ADMIN_PASSWORD;
    else process.env.INITIAL_ADMIN_PASSWORD = previous;
  }
});
