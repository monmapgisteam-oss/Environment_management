const test = require('node:test');
const assert = require('node:assert/strict');
const { detectFileKind } = require('../src/lib/reports/fileType.ts');
const { hashPassword, passwordVersion } = require('../src/lib/auth/password.ts');

const blob = (bytes) => new Blob([new Uint8Array(bytes)]);

test('a file is identified by its first bytes, not its name', async () => {
  assert.equal(await detectFileKind(blob([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])), 'pdf');
  assert.equal(await detectFileKind(blob([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), 'png');
  assert.equal(await detectFileKind(blob([0xff, 0xd8, 0xff, 0xe0])), 'jpeg');
  // HTML or SVG renamed to .pdf is refused.
  assert.equal(await detectFileKind(new Blob(['<svg onload=alert(1)>'])), null);
  assert.equal(await detectFileKind(new Blob(['<html>'])), null);
});

test('a changed password gives sessions a new version, ending the old ones', async () => {
  const before = await hashPassword('old-password-1');
  const after = await hashPassword('new-password-2');
  assert.equal(passwordVersion(before), passwordVersion(before));
  assert.notEqual(passwordVersion(before), passwordVersion(after));
  assert.ok(!passwordVersion(before).includes('scrypt'));
});

test('passwords use the stronger scrypt format, and old hashes still verify but ask for a rehash', async () => {
  const { checkPassword } = require('../src/lib/auth/password.ts');
  const { randomBytes, scryptSync } = require('node:crypto');
  const stored = await hashPassword('correct horse');
  assert.match(stored, /^scrypt:s2\$32768\$8\$3\$/);
  assert.deepEqual(await checkPassword('correct horse', stored), { ok: true, outdated: false });
  assert.deepEqual(await checkPassword('wrong', stored), { ok: false, outdated: false });
  assert.deepEqual(await checkPassword(['correct horse'], stored), { ok: false, outdated: false });
  const salt = randomBytes(16).toString('hex');
  const legacy = `scrypt:${salt}:${scryptSync('correct horse', salt, 64).toString('hex')}`;
  assert.deepEqual(await checkPassword('correct horse', legacy), { ok: true, outdated: true });
  assert.deepEqual(await checkPassword('wrong', legacy), { ok: false, outdated: false });
});

test('an active session older than 30 minutes is renewed with the same user and password version', () => {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-for-session-renewal';
  const jwt = require('jsonwebtoken');
  const { renewedToken, verifyToken } = require('../src/lib/auth/session.ts');
  const payload = { userId: 'u1', role: 'sender', pv: 'abc' };
  const fresh = jwt.sign(payload, require('../src/lib/auth/keys.ts').signingKey('session'), { expiresIn: '8h', audience: 'tailan-session' });
  assert.equal(renewedToken(fresh), null);
  const old = jwt.sign({ ...payload, iat: Math.floor(Date.now() / 1000) - 45 * 60 }, require('../src/lib/auth/keys.ts').signingKey('session'), {
    expiresIn: '8h',
    audience: 'tailan-session',
  });
  const renewed = verifyToken(renewedToken(old));
  assert.equal(renewed.userId, 'u1');
  assert.equal(renewed.pv, 'abc');
  assert.equal(renewedToken('not-a-token'), null);
});
