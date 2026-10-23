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

const { parseConclusion, conclusionFileError } = require('../lib/auth/signup.ts');

const conclusion = {
  conclusionYear: '2025',
  conclusionNumber: ' 04/1234 ',
  projectCategory: 'Үйлдвэрлэл',
  projectName: 'Талх нарийн боовны үйлдвэр',
  district: 'Хан-Уул',
  implementerName: 'Жишээ ХХК',
  conclusionType: 'нөхцөл болзолтойгоор хэрэгжүүлэх боломжтой',
};
const now = new Date('2026-10-23T00:00:00Z');

test('a complete conclusion is cleaned and the year becomes a number', () => {
  const result = parseConclusion(conclusion, now);
  assert.ok('input' in result);
  assert.equal(result.input.year, 2025);
  assert.equal(result.input.conclusionNumber, '04/1234');
  assert.equal(result.input.district, 'Хан-Уул');
});

test('conclusion dropdowns only accept their own values and the year stays in range', () => {
  for (const [key, value] of [
    ['conclusionYear', '2027'],
    ['conclusionYear', '25'],
    ['conclusionNumber', ' '],
    ['projectCategory', 'Уул уурхайн төсөл'],
    ['district', 'Дархан-Уул'],
    ['conclusionType', 'Бусад'],
    ['projectName', ''],
    ['implementerName', ''],
  ]) {
    assert.ok('error' in parseConclusion({ ...conclusion, [key]: value }, now), `${key}=${value}`);
  }
});

test('the conclusion file must be a PDF of 25MB or less', () => {
  assert.equal(conclusionFileError({ name: 'Ерөнхий үнэлгээний дүгнэлт.pdf', type: 'application/pdf', size: 1000 }), null);
  assert.ok(conclusionFileError(null));
  assert.ok(conclusionFileError({ name: 'a.docx', type: 'application/msword', size: 1000 }));
  assert.ok(conclusionFileError({ name: 'a.pdf', type: 'application/pdf', size: 26 * 1024 * 1024 }));
});
