const test = require('node:test');
const assert = require('node:assert/strict');
const { rateLimit, resetRateLimits, clientIp } = require('../lib/auth/rateLimit.ts');

test('allows the configured number of attempts, then blocks until the window ends', () => {
  resetRateLimits();
  const start = 1_000_000;
  for (let i = 0; i < 3; i++) assert.equal(rateLimit('k', 3, 60_000, start + i).ok, true);
  const blocked = rateLimit('k', 3, 60_000, start + 10);
  assert.equal(blocked.ok, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterSeconds >= 59 && blocked.retryAfterSeconds <= 60);
  // A new window starts once the old one has expired.
  assert.equal(rateLimit('k', 3, 60_000, start + 60_000).ok, true);
});

test('keys are independent', () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) rateLimit('a', 2, 60_000, 0);
  assert.equal(rateLimit('b', 2, 60_000, 0).ok, true);
});

test('client address comes from the hop our proxy appended, not the client-set start', () => {
  const req = (headers) => new Request('http://x', { headers });
  // A client can prepend any address; the last entry is what our proxy saw.
  assert.equal(clientIp(req({ 'x-forwarded-for': '1.2.3.4, 203.0.113.9' })), '203.0.113.9');
  assert.equal(clientIp(req({ 'x-forwarded-for': '203.0.113.9' })), '203.0.113.9');
  assert.equal(clientIp(req({ 'x-real-ip': '198.51.100.2' })), '198.51.100.2');
  assert.equal(clientIp(req({})), 'unknown');
});

test('a check without counting does not use up attempts', () => {
  resetRateLimits();
  for (let i = 0; i < 5; i++) assert.equal(rateLimit('peek', 2, 60_000, 0, { count: false }).ok, true);
  rateLimit('peek', 2, 60_000, 0);
  rateLimit('peek', 2, 60_000, 0);
  assert.equal(rateLimit('peek', 2, 60_000, 0, { count: false }).ok, false);
});
