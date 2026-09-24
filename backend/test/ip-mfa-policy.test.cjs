const { test } = require('node:test');
const assert = require('node:assert/strict');
const { UnauthorizedException } = require('@nestjs/common');
const {
  isIpAllowedForUser,
  isSessionIpMatch,
  normalizeIpAddress,
} = require('../src/auth/ip-policy');
const { isMfaRequiredForUser } = require('../src/auth/mfa-policy');
const { JwtStrategy } = require('../src/auth/strategies/jwt.strategy');
const { AuthService } = require('../src/auth/auth.service');
const { SettingsService } = require('../src/settings/settings.service');
const { BadRequestException } = require('@nestjs/common');
const bcrypt = require('bcrypt');

test('IP policy normalizes IPv4-mapped addresses and rejects unregistered IPs', () => {
  const user = {
    allowedIps: [{ ipAddress: '192.168.10.25' }, { ipAddress: '2001:db8::25' }],
  };

  assert.equal(normalizeIpAddress('::ffff:192.168.10.25'), '192.168.10.25');
  assert.equal(normalizeIpAddress('2001:0DB8:0:0:0:0:0:25'), '2001:db8::25');
  assert.equal(isIpAllowedForUser(user, '::ffff:192.168.10.25'), true);
  assert.equal(isIpAllowedForUser(user, '192.168.10.26'), false);
  assert.equal(isSessionIpMatch('::ffff:192.168.10.25', '192.168.10.25'), true);
  assert.equal(isSessionIpMatch('192.168.10.25', '192.168.10.26'), false);
  assert.equal(isIpAllowedForUser({ allowedIps: [] }, '203.0.113.1', false), true);
});

test('JWT validation destroys a session when the request IP changes', async () => {
  let deletedSessionId;
  const strategy = new JwtStrategy(
    { get: () => 'fixture-secret-not-production-123456' },
    {
      user: {
        findUnique: async () => ({
          id: 1,
          username: 'fixture',
          name: 'Fixture',
          role: 'admin',
          department: null,
          isActive: true,
          isFirstLogin: false,
          passwordChangedAt: new Date(),
          mfaEnabled: true,
          allowedIps: [{ ipAddress: '192.168.10.25' }],
        }),
      },
      userSession: {
        findFirst: async () => ({ id: 9, ipAddress: '192.168.10.25', lastActivity: new Date() }),
        deleteMany: async ({ where }) => {
          deletedSessionId = where.id;
          return { count: 1 };
        },
        updateMany: async () => ({ count: 1 }),
      },
      systemSettings: {
        findFirst: async () => ({ sessionTimeoutMinutes: 30, otpEnabled: false, ipRestrictionEnabled: true }),
      },
    },
  );

  await assert.rejects(
    strategy.validate(
      { ip: '192.168.10.26', headers: {} },
      { sub: 1, sessionId: 'fixture-session', type: 'access' },
    ),
    (error) => error instanceof UnauthorizedException && /IP/.test(error.message),
  );
  assert.equal(deletedSessionId, 9);
});

test('login with a valid password is blocked and audited from an unregistered IP', async () => {
  const passwordHash = await bcrypt.hash('correct-password', 4);
  let loginAttempt;
  let failedCounterUpdated = false;
  const service = new AuthService(
    {
      user: {
        findUnique: async () => ({
          id: 1,
          username: 'fixture',
          passwordHash,
          isActive: true,
          isLocked: false,
          allowedIps: [{ ipAddress: '192.168.10.25' }],
        }),
        update: async () => {
          failedCounterUpdated = true;
        },
      },
      loginAttempt: {
        create: async ({ data }) => {
          loginAttempt = data;
          return data;
        },
      },
      systemSettings: { findFirst: async () => ({ ipRestrictionEnabled: true }) },
    },
    {},
    {},
    { createServiceLog: async () => ({}) },
    {},
    {},
    {},
  );

  await assert.rejects(
    service.login({ username: 'fixture', password: 'correct-password' }, '192.168.10.26'),
    /등록되지 않은 IP/,
  );
  assert.equal(loginAttempt.failureReason, 'IP_RESTRICTED');
  assert.equal(loginAttempt.ipAddress, '192.168.10.26');
  assert.equal(failedCounterUpdated, false);
});

test('MFA policy targets administrators and selected departments independently', () => {
  const settings = {
    otpEnabled: true,
    otpApplyToAdministrators: true,
    otpApplyToTechDepartment: false,
    otpApplyToSalesDepartment: true,
    otpApplyToDevDepartment: false,
  };

  assert.equal(isMfaRequiredForUser(settings, { role: 'super_admin' }), true);
  assert.equal(isMfaRequiredForUser(settings, { role: 'admin' }), true);
  assert.equal(isMfaRequiredForUser(settings, { role: 'user', department: '기술팀' }), false);
  assert.equal(isMfaRequiredForUser(settings, { role: 'user', department: '영업팀' }), true);
  assert.equal(isMfaRequiredForUser(settings, { role: 'user', department: '개발팀' }), false);
  assert.equal(isMfaRequiredForUser({ ...settings, otpEnabled: false }, { role: 'admin' }), false);
});

test('MFA policy keeps legacy all-target behavior when new target fields are absent', () => {
  const legacySettings = { otpEnabled: true };
  assert.equal(isMfaRequiredForUser(legacySettings, { role: 'admin' }), true);
  assert.equal(isMfaRequiredForUser(legacySettings, { role: 'user', department: '기술팀' }), true);
  assert.equal(isMfaRequiredForUser(legacySettings, { role: 'user', department: '영업팀' }), true);
  assert.equal(isMfaRequiredForUser(legacySettings, { role: 'user', department: '개발팀' }), true);
});

test('enabling global IP restriction seeds the latest successful IP for accounts without a manual allowlist', async () => {
  let savedIps;
  let persistedSettings;
  const settings = {
    id: 1,
    ipRestrictionEnabled: false,
    otpEnabled: false,
    otpApplyToAdministrators: true,
    otpApplyToTechDepartment: true,
    otpApplyToSalesDepartment: true,
    otpApplyToDevDepartment: true,
  };
  const service = new SettingsService(
    {
      systemSettings: {
        findFirst: async () => settings,
        update: async ({ data }) => {
          persistedSettings = data;
          return { ...settings, ...data, updatedAt: new Date() };
        },
      },
      user: {
        findMany: async () => [
          { id: 1, username: 'one', name: 'One', allowedIps: [] },
          { id: 2, username: 'two', name: 'Two', allowedIps: [] },
        ],
        findUnique: async () => ({ username: 'root' }),
      },
      loginAttempt: {
        findMany: async ({ orderBy, distinct }) => {
          assert.deepEqual(orderBy, { attemptTime: 'desc' });
          assert.deepEqual(distinct, ['userId']);
          return [
            { userId: 1, ipAddress: '192.168.10.11' },
            { userId: 2, ipAddress: '192.168.10.12' },
          ];
        },
      },
      userAllowedIp: {
        createMany: async ({ data, skipDuplicates }) => {
          savedIps = data;
          assert.equal(skipDuplicates, true);
          return { count: data.length };
        },
      },
    },
    { createServiceLog: async () => ({}) },
    {},
  );

  await service.updateSettings({ ipRestrictionEnabled: true }, 9);
  assert.deepEqual(savedIps, [
    { userId: 1, ipAddress: '192.168.10.11' },
    { userId: 2, ipAddress: '192.168.10.12' },
  ]);
  assert.equal(persistedSettings.ipRestrictionEnabled, true);
});

test('global IP restriction cannot be enabled while active accounts have no history or registered IP', async () => {
  let settingsUpdated = false;
  const service = new SettingsService(
    {
      systemSettings: {
        findFirst: async () => ({ id: 1, ipRestrictionEnabled: false, otpEnabled: false }),
        update: async () => {
          settingsUpdated = true;
        },
      },
      user: {
        findMany: async () => [{ id: 2, username: 'new-account', isActive: true, allowedIps: [] }],
        findUnique: async () => ({ username: 'root' }),
      },
      loginAttempt: { findMany: async () => [] },
    },
    {},
    {},
  );

  await assert.rejects(
    service.updateSettings({ ipRestrictionEnabled: true }, 9),
    (error) => error instanceof BadRequestException && /new-account/.test(error.message),
  );
  assert.equal(settingsUpdated, false);
});
