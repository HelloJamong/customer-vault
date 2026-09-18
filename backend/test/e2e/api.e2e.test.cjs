const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const baseUrl = (process.env.E2E_BASE_URL || 'http://127.0.0.1:15000').replace(/\/$/, '');
const initialPassword = process.env.E2E_INITIAL_ADMIN_PASSWORD;
const changedPassword = process.env.E2E_CHANGED_ADMIN_PASSWORD;

function base32Decode(value) {
  const normalized = value.replace(/=+$/, '').toUpperCase();
  let bits = '';
  for (const character of normalized) {
    const index = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(character);
    if (index < 0) throw new Error(`Invalid base32 character: ${character}`);
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let offset = 0; offset + 8 <= bits.length; offset += 8) {
    bytes.push(Number.parseInt(bits.slice(offset, offset + 8), 2));
  }
  return Buffer.from(bytes);
}

function totpCode(secret, timestamp = Date.now()) {
  const counter = Math.floor(timestamp / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigInt64BE(BigInt(counter));
  const digest = crypto.createHmac('sha1', base32Decode(secret)).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const value = (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, '0');
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'content-type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  let body = text;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Keep non-JSON responses available to assertion failures.
  }
  return { response, body };
}

test('health endpoint reports a connected database', async () => {
  const { response, body } = await request('/api/health');
  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'connected');
});

test('protected customer endpoint rejects unauthenticated requests', async () => {
  const { response } = await request('/api/customers');
  assert.equal(response.status, 401);
});

test('initial admin password is forced through the login password-change flow', async () => {
  assert.ok(initialPassword, 'E2E_INITIAL_ADMIN_PASSWORD must be provided by the isolated test runner');
  assert.ok(changedPassword, 'E2E_CHANGED_ADMIN_PASSWORD must be provided by the isolated test runner');

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: initialPassword }),
  });
  assert.equal(login.response.status, 200);
  assert.equal(login.body.user.isFirstLogin, true);
  assert.ok(login.body.accessToken);
  assert.equal(login.body.session.timeoutMinutes, 30);
  assert.equal(login.body.session.warningSeconds, 60);

  const firstLoginHeaders = { authorization: `Bearer ${login.body.accessToken}` };
  const extension = await request('/api/auth/extend-session', {
    method: 'POST',
    headers: firstLoginHeaders,
  });
  assert.equal(extension.response.status, 200);
  assert.equal(extension.body.timeoutMinutes, 30);
  assert.equal(extension.body.warningSeconds, 60);

  const blockedDashboard = await request('/api/dashboard/stats', { headers: firstLoginHeaders });
  assert.equal(blockedDashboard.response.status, 403);
  assert.equal(blockedDashboard.body.code, 'PASSWORD_CHANGE_REQUIRED');

  const changed = await request('/api/auth/change-password', {
    method: 'POST',
    headers: firstLoginHeaders,
    body: JSON.stringify({ currentPassword: initialPassword, newPassword: changedPassword }),
  });
  assert.equal(changed.response.status, 200);

  const dashboard = await request('/api/dashboard/stats', { headers: firstLoginHeaders });
  assert.equal(dashboard.response.status, 200);

  const logout = await request('/api/auth/logout', {
    method: 'POST',
    headers: firstLoginHeaders,
  });
  assert.equal(logout.response.status, 200);

  const afterLogout = await request('/api/auth/me', { headers: firstLoginHeaders });
  assert.equal(afterLogout.response.status, 401);

  const newLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: changedPassword }),
  });
  assert.equal(newLogin.response.status, 200);
  assert.equal(newLogin.body.user.isFirstLogin, false);
  const adminHeaders = { authorization: `Bearer ${newLogin.body.accessToken}` };

  const settings = await request('/api/settings', { headers: adminHeaders });
  assert.equal(settings.response.status, 200);
  assert.equal(settings.body.sessionTimeoutMinutes, 30);
  assert.equal(settings.body.sessionTimeoutWarningEnabled, true);
  assert.equal(settings.body.otpEnabled, false);

  const updatedSettings = await request('/api/settings', {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({
      sessionTimeoutMinutes: 10,
      sessionTimeoutWarningEnabled: false,
      otpEnabled: true,
    }),
  });
  assert.equal(updatedSettings.response.status, 200);

  const updatedPolicy = await request('/api/auth/session-policy', { headers: adminHeaders });
  assert.equal(updatedPolicy.response.status, 200);
  assert.equal(updatedPolicy.body.timeoutMinutes, 10);
  assert.equal(updatedPolicy.body.warningEnabled, false);
  assert.equal(updatedPolicy.body.warningSeconds, 60);

  const adminLogout = await request('/api/auth/logout', {
    method: 'POST',
    headers: adminHeaders,
  });
  assert.equal(adminLogout.response.status, 200);

  const setupLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: changedPassword }),
  });
  assert.equal(setupLogin.response.status, 200);
  assert.equal(setupLogin.body.user.mfaSetupRequired, true);
  assert.ok(setupLogin.body.accessToken);
  const setupHeaders = { authorization: `Bearer ${setupLogin.body.accessToken}` };

  const setup = await request('/api/auth/mfa/setup', {
    method: 'POST',
    headers: setupHeaders,
  });
  assert.equal(setup.response.status, 200);
  assert.match(setup.body.qrCode, /^data:image\/png;base64,/);
  assert.match(setup.body.manualKey, /^[A-Z2-7]+$/);

  const confirmation = await request('/api/auth/mfa/setup/confirm', {
    method: 'POST',
    headers: setupHeaders,
    body: JSON.stringify({ code: totpCode(setup.body.manualKey) }),
  });
  assert.equal(confirmation.response.status, 200);
  assert.equal(confirmation.body.enabled, true);

  const setupDashboard = await request('/api/dashboard/stats', { headers: setupHeaders });
  assert.equal(setupDashboard.response.status, 200);

  const setupLogout = await request('/api/auth/logout', {
    method: 'POST',
    headers: setupHeaders,
  });
  assert.equal(setupLogout.response.status, 200);

  const mfaLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: changedPassword }),
  });
  assert.equal(mfaLogin.response.status, 200);
  assert.equal(mfaLogin.body.mfaRequired, true);
  assert.ok(mfaLogin.body.mfaChallengeToken);
  assert.equal(mfaLogin.body.accessToken, undefined);

  const verifiedLogin = await request('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeToken: mfaLogin.body.mfaChallengeToken,
      // 등록 확인에 사용한 현재 시간대 코드는 이미 소비되었으므로 다음 시간대 코드를 사용한다.
      code: totpCode(setup.body.manualKey, Date.now() + 30_000),
    }),
  });
  assert.equal(verifiedLogin.response.status, 200);
  assert.ok(verifiedLogin.body.accessToken);
  assert.equal(verifiedLogin.body.user.mfaEnabled, true);
  const verifiedHeaders = { authorization: `Bearer ${verifiedLogin.body.accessToken}` };
  const verifiedDashboard = await request('/api/dashboard/stats', { headers: verifiedHeaders });
  assert.equal(verifiedDashboard.response.status, 200);

  const failedMfaLogin = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username: 'admin', password: changedPassword }),
  });
  assert.equal(failedMfaLogin.response.status, 200);
  const currentCode = totpCode(setup.body.manualKey);
  const wrongCode = String((Number(currentCode) + 1) % 1_000_000).padStart(6, '0');
  const failedMfaVerify = await request('/api/auth/mfa/verify', {
    method: 'POST',
    body: JSON.stringify({
      challengeToken: failedMfaLogin.body.mfaChallengeToken,
      code: wrongCode,
    }),
  });
  assert.equal(failedMfaVerify.response.status, 401);

  const loginLogs = await request('/api/logs/login?searchText=OTP', {
    headers: verifiedHeaders,
  });
  assert.equal(loginLogs.response.status, 200);
  assert.ok(loginLogs.body.data.some((log) => log.action === 'OTP 로그인 실패'));

  const systemLoginLogs = await request('/api/logs/system?searchText=로그인', {
    headers: verifiedHeaders,
  });
  assert.equal(systemLoginLogs.response.status, 200);
  assert.equal(systemLoginLogs.body.meta.total, 0);

  const verifiedLogout = await request('/api/auth/logout', {
    method: 'POST',
    headers: verifiedHeaders,
  });
  assert.equal(verifiedLogout.response.status, 200);
});
