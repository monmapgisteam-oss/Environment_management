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
