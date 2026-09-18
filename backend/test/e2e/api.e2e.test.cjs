const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = (process.env.E2E_BASE_URL || 'http://127.0.0.1:15000').replace(/\/$/, '');
const initialPassword = process.env.E2E_INITIAL_ADMIN_PASSWORD;
const changedPassword = process.env.E2E_CHANGED_ADMIN_PASSWORD || 'E2e-New-9!';

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

  const updatedSettings = await request('/api/settings', {
    method: 'PATCH',
    headers: adminHeaders,
    body: JSON.stringify({ sessionTimeoutMinutes: 10, sessionTimeoutWarningEnabled: false }),
  });
  assert.equal(updatedSettings.response.status, 200);

  const updatedPolicy = await request('/api/auth/session-policy', { headers: adminHeaders });
  assert.equal(updatedPolicy.response.status, 200);
  assert.equal(updatedPolicy.body.timeoutMinutes, 10);
  assert.equal(updatedPolicy.body.warningEnabled, false);
  assert.equal(updatedPolicy.body.warningSeconds, 60);

  await request('/api/auth/logout', {
    method: 'POST',
    headers: adminHeaders,
  });
});
