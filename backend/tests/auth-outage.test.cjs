const test = require('node:test');
const assert = require('node:assert/strict');
const headers = require('../src/http/next.ts');
const dataStore = require('../src/lib/db/index.ts').default;
const { getCurrentUser, getApiUser } = require('../src/lib/auth/index.ts');
const { createToken } = require('../src/lib/auth/session.ts');
const { passwordVersion } = require('../src/lib/auth/password.ts');

test('a database outage makes protected auth fail instead of passing', async (t) => {
  const original = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-session-secret';
  t.after(() => {
    t.mock.restoreAll();
    if (original === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = original;
  });
  const token = createToken({ userId: 'user-1', role: 'admin', pv: passwordVersion('stored-password') });
  t.mock.method(headers, 'cookies', async () => ({ get: () => ({ value: token }) }));
  const unavailable = new TypeError('fetch failed', { cause: { code: 'ENOTFOUND' } });
  const lookup = t.mock.method(dataStore.user, 'findUnique', async () => { throw unavailable; });
  await assert.rejects(getCurrentUser(), (error) => error === unavailable);
  await assert.rejects(getApiUser('admin'), (error) => error === unavailable);

  lookup.mock.mockImplementation(async () => ({ id: 'user-1', name: 'Admin', role: 'admin', password: 'stored-password' }));
  assert.equal((await getApiUser('admin'))?.id, 'user-1');
});
