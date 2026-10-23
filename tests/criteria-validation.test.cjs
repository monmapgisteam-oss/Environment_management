const test = require('node:test');
const assert = require('node:assert/strict');
const { parseCriterionFields } = require('../lib/reports/criteria.ts');

test('a new criterion needs a name, a known category and a score from 1 to 100', () => {
  assert.deepEqual(parseCriterionFields({ name: ' Хог ', category: 'Үйлдвэрлэл', maxScore: '15' }), {
    fields: { name: 'Хог', category: 'Үйлдвэрлэл', maxScore: 15 },
  });
  assert.ok('error' in parseCriterionFields({ name: '', category: 'Үйлдвэрлэл', maxScore: 5 }));
  assert.ok('error' in parseCriterionFields({ name: 'x', category: 'Газрын тос', maxScore: 5 }));
  assert.ok('error' in parseCriterionFields({ name: 'x', category: 'Үйлдвэрлэл', maxScore: 0 }));
  assert.ok('error' in parseCriterionFields({ name: 'x', category: 'Үйлдвэрлэл', maxScore: 101 }));
  assert.ok('error' in parseCriterionFields({ name: 'x', category: 'Үйлдвэрлэл', maxScore: 2.5 }));
  assert.ok('error' in parseCriterionFields({ name: 'x', category: 'Үйлдвэрлэл' }));
});

test('a partial edit validates only the fields it carries', () => {
  assert.deepEqual(parseCriterionFields({ maxScore: 30 }, { partial: true }), { fields: { maxScore: 30 } });
  assert.deepEqual(parseCriterionFields({}, { partial: true }), { fields: {} });
  assert.ok('error' in parseCriterionFields({ name: '   ' }, { partial: true }));
});

test('plans and performance reports are scored on separate sheets', () => {
  const { sheetForReportType } = require('../lib/reports/criteria.ts');
  assert.equal(sheetForReportType('Жилийн төлөвлөгөө'), 'plan');
  assert.equal(sheetForReportType('Биелэлтийн тайлан'), 'performance');
  assert.equal(sheetForReportType(null), 'performance');
});
