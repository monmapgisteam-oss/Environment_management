const test = require('node:test');
const assert = require('node:assert/strict');
const { decodeView, encodeView } = require('../../shared/views/encoding.ts');

test('view data keeps dates as Date objects across the backend-frontend hop', () => {
  const createdAt = new Date('2026-11-12T08:00:00.000Z');
  const decoded = decodeView(encodeView({ report: { createdAt, nested: [{ at: createdAt }], note: 'x' }, empty: null }));
  assert.ok(decoded.report.createdAt instanceof Date);
  assert.equal(decoded.report.createdAt.getTime(), createdAt.getTime());
  assert.ok(decoded.report.nested[0].at instanceof Date);
  assert.equal(decoded.report.note, 'x');
  assert.equal(decoded.empty, null);
  // A plain object that only looks partly like a tag stays an object.
  assert.deepEqual(decodeView(JSON.stringify({ value: { $date: 'x', other: 1 } })), { value: { $date: 'x', other: 1 } });
});
