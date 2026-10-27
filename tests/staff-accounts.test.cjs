const test = require('node:test');
const assert = require('node:assert/strict');
const { parseStaffAccount, parseNewPassword, isActiveUser, ACTIVE_USER_WHERE } = require('../lib/auth/accounts.ts');

const valid = { name: ' Б. Болд ', email: 'Bold@Tailan.MN', role: 'evaluator', password: 'Temp1234', position: '', phone: '' };

test('an admin-created account is cleaned and limited to review roles', () => {
  const result = parseStaffAccount(valid);
  assert.ok('input' in result);
  assert.deepEqual(result.input, { name: 'Б. Болд', email: 'bold@tailan.mn', role: 'evaluator', password: 'Temp1234', position: null, phone: null });
  assert.ok('error' in parseStaffAccount({ ...valid, role: 'admin' }));
  assert.ok('error' in parseStaffAccount({ ...valid, role: 'sender' }));
  assert.ok('error' in parseStaffAccount({ ...valid, password: 'short' }));
  assert.ok('error' in parseStaffAccount({ ...valid, email: 'not-an-email' }));
});

test('the new password must be long enough and typed twice the same', () => {
  assert.deepEqual(parseNewPassword({ newPassword: 'Secret123', confirmPassword: 'Secret123' }), { password: 'Secret123' });
  assert.ok('error' in parseNewPassword({ newPassword: 'Secret123', confirmPassword: 'Secret124' }));
  assert.ok('error' in parseNewPassword({ newPassword: 'short', confirmPassword: 'short' }));
});

test('older accounts without a flag count as active', () => {
  assert.equal(isActiveUser({}), true);
  assert.equal(isActiveUser({ isActive: null }), true);
  assert.equal(isActiveUser({ isActive: false }), false);
  assert.deepEqual(ACTIVE_USER_WHERE, { OR: [{ isActive: null }, { isActive: true }] });
});

test('a broadcast needs a title, a message and a known audience', () => {
  const { parseBroadcast, audienceRoles } = require('../lib/notifications/broadcast.ts');
  assert.deepEqual(parseBroadcast({ title: ' Сануулга ', message: ' Хугацаа дуусна ', audience: 'sender' }), {
    input: { title: 'Сануулга', message: 'Хугацаа дуусна', audience: 'sender' },
  });
  assert.ok('error' in parseBroadcast({ title: '', message: 'x', audience: 'all' }));
  assert.ok('error' in parseBroadcast({ title: 'x', message: 'x', audience: 'admin' }));
  assert.ok('error' in parseBroadcast({ title: 'x'.repeat(121), message: 'x', audience: 'all' }));
  assert.deepEqual(audienceRoles('all').sort(), ['evaluator', 'review_manager', 'sender']);
  assert.deepEqual(audienceRoles('review').sort(), ['evaluator', 'review_manager']);
});

test('a conclusion comment needs text within the length limit', () => {
  const { parseComment, COMMENT_MAX_LENGTH } = require('../lib/reports/reportComments.ts');
  assert.deepEqual(parseComment('  Дүгнэлтийн хуудас дутуу  '), { body: 'Дүгнэлтийн хуудас дутуу' });
  assert.ok('error' in parseComment('   '));
  assert.ok('error' in parseComment(42));
  assert.ok('error' in parseComment('a'.repeat(COMMENT_MAX_LENGTH + 1)));
});
