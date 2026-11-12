const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-session-secret-at-least-32-characters';
const jwt = require('jsonwebtoken');
const { createToken, renewedToken, verifyToken } = require('../src/lib/auth/session.ts');

const now = () => Math.floor(Date.now() / 1000);
const token = (iatAgo, atAgo) =>
  jwt.sign({ userId: 'u', role: 'admin', iat: now() - iatAgo, at: now() - atAgo }, require('../src/lib/auth/keys.ts').signingKey('session'), { expiresIn: '8h', audience: 'tailan-session' });

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
  const forged = jwt.sign({ userId: 'u', role: 'admin' }, require('../src/lib/auth/keys.ts').signingKey('session'), { algorithm: 'HS512', audience: 'tailan-session' });
  assert.equal(verifyToken(forged), null);
});

test('a session logged out on the server, or cut off by "sign out everywhere", is refused', async (t) => {
  const arcgis = require('../src/lib/db/arcgis.ts');
  const rows = new Map();
  const layer = { id: 9, objectIdField: 'OBJECTID', fields: ['key', 'count', 'resetAt'].map((f) => ({ name: `app_${f}` })) };
  t.mock.method(arcgis, 'layerInfo', async () => layer);
  t.mock.method(arcgis, 'storedFieldName', (_layer, field) => `app_${field}`);
  t.mock.method(arcgis, 'sqlString', (value) => `'${value}'`);
  t.mock.method(arcgis, 'queryFeatures', async (_layer, where) => {
    const key = where.match(/'(.*)'/)[1];
    return rows.has(key) ? [{ attributes: { OBJECTID: 1, app_resetAt: rows.get(key) } }] : [];
  });
  t.mock.method(arcgis, 'applyEdits', async ([edit]) => {
    const attributes = (edit.adds ?? edit.updates)[0].attributes;
    rows.set(attributes.app_key, attributes.app_resetAt);
  });
  const { isSessionRevoked, revokeAllSessions, revokeSession } = require('../src/lib/auth/revocation.ts');
  const one = verifyToken(createToken({ userId: 'u1', role: 'admin' }));
  const other = verifyToken(createToken({ userId: 'u1', role: 'admin' }));
  assert.equal(await isSessionRevoked(one), false);
  await revokeSession(one);
  assert.equal(await isSessionRevoked(one), true);
  assert.equal(await isSessionRevoked(other), false);
  await revokeAllSessions('u1');
  assert.equal(await isSessionRevoked(other), true);
  // A sign-in after the cut-off works.
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(await isSessionRevoked(verifyToken(createToken({ userId: 'u1', role: 'admin' }))), false);
});
