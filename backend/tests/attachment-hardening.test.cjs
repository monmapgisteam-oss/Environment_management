const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAttachments, serializeReportAttachments } = require('../../shared/reports/attachments.ts');
const store = require('../src/lib/db/index.ts').default;
const { attachmentError } = require('../src/lib/reports/attachmentOwnership.ts');
const storage = require('../src/lib/db/storage.ts');
const { withKeyLock } = require('../src/lib/auth/keyedLock.ts');

const OWN = 'upload:11111111-1111-4111-8111-111111111111';
const listed = JSON.stringify([{ url: OWN, name: 'a.pdf' }]);

test('a file list that is not a string is no list at all', async () => {
  // JSON.parse would read ['[...]'] as the string inside it.
  assert.deepEqual(parseAttachments([listed]), []);
  assert.equal(serializeReportAttachments([listed]), null);
  assert.equal(await attachmentError([listed], { id: 'u', companyId: 'c' }), 'Файл буруу байна.');
  assert.equal(await attachmentError({ url: OWN }, { id: 'u', companyId: 'c' }), 'Файл буруу байна.');
});

test("a sender cannot attach a file that is already on another report", async (t) => {
  t.mock.method(store.user, 'findMany', async () => [{ id: 'u' }]);
  t.mock.method(store.upload, 'findMany', async () => [{ id: OWN.slice(7), name: 'a.pdf' }]);
  const reports = [{ id: 'sent', fileUrl: listed, signedScanUrl: null }];
  t.mock.method(store.report, 'findMany', async () => reports);
  t.mock.method(store.reportLocation, 'findMany', async () => []);
  assert.equal(await attachmentError(listed, { id: 'u', companyId: 'c' }), 'Файл буруу байна.');
  // The report that already holds it may keep it.
  assert.equal(await attachmentError(listed, { id: 'u', companyId: 'c' }, [], 'sent'), null);
  reports.length = 0;
  assert.equal(await attachmentError(listed, { id: 'u', companyId: 'c' }), null);
});

test('deleting a draft keeps an upload another report still uses', async (t) => {
  t.mock.method(store.report, 'findMany', async () => [{ id: 'sent', fileUrl: listed, signedScanUrl: null }]);
  t.mock.method(store.reportLocation, 'findMany', async () => []);
  const removed = t.mock.method(store.upload, 'deleteMany', async () => ({ count: 1 }));
  await storage.deleteUploads([OWN]);
  assert.equal(removed.mock.callCount(), 0);
  await storage.deleteUploads(['upload:22222222-2222-4222-8222-222222222222']);
  assert.equal(removed.mock.callCount(), 1);
});

test('checks under the same key run one at a time', async () => {
  let running = 0;
  let most = 0;
  const work = () => withKeyLock('pin:user', async () => {
    running += 1;
    most = Math.max(most, running);
    await new Promise((resolve) => setTimeout(resolve, 5));
    running -= 1;
  });
  await Promise.all([work(), work(), work(), withKeyLock('pin:other', async () => {})]);
  assert.equal(most, 1);
});
