const { test } = require('node:test');
const assert = require('node:assert/strict');
const proxyaddr = require('proxy-addr');
const { getTrustProxySetting } = require('../src/common/utils/trust-proxy.util');

test('trusted proxy addresses resolve the original client through the nginx chain', () => {
  const trust = proxyaddr.compile(getTrustProxySetting('203.0.113.0/24, 198.51.100.20/32'));
  const request = {
    connection: { remoteAddress: '203.0.113.3' },
    headers: { 'x-forwarded-for': '198.51.100.15, 198.51.100.20' },
  };

  assert.equal(proxyaddr(request, trust), '198.51.100.15');
});

test('an untrusted direct client cannot spoof its address with X-Forwarded-For', () => {
  const trust = proxyaddr.compile(getTrustProxySetting('203.0.113.0/24, 198.51.100.20/32'));
  const request = {
    connection: { remoteAddress: '203.0.113.3' },
    headers: { 'x-forwarded-for': '192.0.2.99, 198.51.100.15' },
  };

  assert.equal(proxyaddr(request, trust), '198.51.100.15');
});

test('proxy hop count remains the fallback when no trusted address list is configured', () => {
  assert.equal(getTrustProxySetting(undefined, undefined), 1);
  assert.equal(getTrustProxySetting(undefined, '2'), 2);
});
