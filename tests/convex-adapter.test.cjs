const test = require('node:test');
const assert = require('node:assert/strict');
const clients = require('../lib/db/convex.ts');
const store = require('../lib/db/index.ts').default;
const { hit } = require('../lib/db/rateLimit.ts');
const storage = require('../lib/db/storage.ts');

function mockClient(t, client) {
  t.after(() => t.mock.restoreAll());
  t.mock.method(clients, 'convex', () => client);
  t.mock.method(clients, 'serverSecret', () => 'test-server-secret');
}

test('the server adapter preserves nested dates, null fields, and authenticated arguments', async (t) => {
  const calls = [];
  mockClient(t, { query: async (fn, args) => {
    calls.push(args);
    return { id: 'r', submittedAt: 2000, location: { createdAt: 1000 }, scoresApprovedAt: null };
  } });
  const report = await store.report.findUnique({ where: { submittedAt: { gte: new Date(1000) }, ignored: undefined }, include: { location: true } });
  assert.deepEqual(calls[0], { secret: 'test-server-secret', model: 'report', op: 'findUnique', args: { where: { submittedAt: { gte: 1000 } }, include: { location: true } } });
  assert.equal(report.submittedAt.getTime(), 2000);
  assert.equal(report.location.createdAt.getTime(), 1000);
  assert.equal(report.scoresApprovedAt, null);
});

test('writes are not retried after an ambiguous connection failure', async (t) => {
  let writes = 0;
  mockClient(t, { mutation: async () => { writes++; throw new TypeError('fetch failed'); } });
  await assert.rejects(store.report.create({ data: {} }), /fetch failed/);
  assert.equal(writes, 1);
});

test('shared rate limiting hashes the key and supports checking without counting', async (t) => {
  let received;
  mockClient(t, { mutation: async (fn, args) => { received = args; return { ok: true, remaining: 2, retryAfterSeconds: 0 }; } });
  assert.equal((await hit('private-email@example.test', 3, 1000, { count: false })).ok, true);
  assert.match(received.key, /^[a-f0-9]{64}$/);
  assert.equal(received.count, false);
  assert.equal(received.secret, 'test-server-secret');
});

test('both attachment prefixes stay usable and file cleanup is a single authenticated mutation', async (t) => {
  let received;
  const id = '51b63a99-ae48-4f02-996a-986197559089';
  mockClient(t, { mutation: async (fn, args) => { received = args; } });
  assert.equal(storage.isUploadReference(`upload:${id}`), true);
  assert.equal(storage.isUploadReference(`convex-upload:${id}`), true);
  await storage.deleteUploads([`upload:${id}`, '/unrelated.pdf']);
  assert.deepEqual(received, { secret: 'test-server-secret', ids: [id] });
});
