const test = require('node:test');
const assert = require('node:assert/strict');
const { parseSignup } = require('../lib/auth/signup.ts');

const valid = {
  companyName: ' Жишээ ХХК ',
  registerNumber: '2036479',
  companyPhone: '',
  contactName: 'Б. Батбаяр',
  position: '',
  phone: '99001122',
  email: 'Name@Company.MN',
  password: 'Secret123!',
  passwordConfirm: 'Secret123!',
};

test('a complete sign-up is cleaned: trimmed, email lowercased, blanks become null', () => {
  const result = parseSignup(valid);
  assert.ok('input' in result);
  assert.deepEqual(result.input, {
    companyName: 'Жишээ ХХК',
    registerNumber: '2036479',
    companyPhone: null,
    contactName: 'Б. Батбаяр',
    position: null,
    phone: '99001122',
    email: 'name@company.mn',
    password: 'Secret123!',
  });
});

test('each required field is checked and the first problem is reported', () => {
  const bad = (patch) => parseSignup({ ...valid, ...patch });
  assert.ok('error' in bad({ companyName: 'A' }));
  assert.ok('error' in bad({ registerNumber: '12345' }));
  assert.ok('error' in bad({ registerNumber: 'REV0011' }));
  assert.ok('error' in bad({ contactName: '' }));
  assert.ok('error' in bad({ email: 'not-an-email' }));
  assert.ok('error' in bad({ password: 'short', passwordConfirm: 'short' }));
  assert.ok('error' in bad({ passwordConfirm: 'Different1' }));
  assert.ok('error' in parseSignup({}));
});
