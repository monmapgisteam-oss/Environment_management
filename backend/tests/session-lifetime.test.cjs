const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-session-secret-at-least-32-characters';
const jwt = require('jsonwebtoken');
const { createToken, renewedToken, verifyToken } = require('../src/lib/auth/session.ts');

const now = () => Math.floor(Date.now() / 1000);
const token = (iatAgo, atAgo) =>
  jwt.sign({ userId: 'u', role: 'admin', iat: now() - iatAgo, at: now() - atAgo }, process.env.JWT_SECRET, { expiresIn: '8h', audience: 'tailan-session' });

test('renewal keeps the sign-in time, and a session ends 12 hours after sign-in', () => {
  const fresh = verifyToken(createToken({ userId: 'u', role: 'admin' }));
  assert.ok(Math.abs(fresh.at - now()) <= 1);

  const renewed = renewedToken(token(40 * 60, 5 * 3600));
  assert.ok(renewed);
  assert.ok(Math.abs(verifyToken(renewed).at - (now() - 5 * 3600)) <= 1);

  assert.equal(renewedToken(token(40 * 60, 13 * 3600)), null);
  assert.equal(verifyToken(token(40 * 60, 13 * 3600)), null);
});

test('session tokens signed with another algorithm are refused', () => {
  const forged = jwt.sign({ userId: 'u', role: 'admin' }, process.env.JWT_SECRET, { algorithm: 'HS512', audience: 'tailan-session' });
  assert.equal(verifyToken(forged), null);
});
