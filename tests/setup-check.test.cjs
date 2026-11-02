const test = require('node:test');
const assert = require('node:assert/strict');
const { findSetupProblems } = require('../lib/setupCheck.ts');
const { reportKind } = require('../lib/reports/terms.ts');
const { REPORT_CATEGORIES } = require('../lib/constants.ts');

const coreTypes = [
  { slug: 'type-1', name: 'Жилийн төлөвлөгөө', isActive: true },
  { slug: 'type-2', name: 'Биелэлтийн тайлан', isActive: true },
];
const fullSheets = REPORT_CATEGORIES.flatMap((category) => [
  { category, sheet: 'plan', maxScore: 100, isActive: true },
  { category, sheet: null, maxScore: 100, isActive: true },
]);

test('a renamed core type is still a plan or a performance report', () => {
  assert.equal(reportKind({ slug: 'type-1', name: 'БОМТ' }), 'plan');
  assert.equal(reportKind({ slug: 'type-2', name: 'Тайлан' }), 'performance');
  assert.equal(reportKind('Жилийн төлөвлөгөө'), 'plan');
  assert.equal(reportKind({ slug: 'survey123-1', name: 'Бусад' }), null);
});

test('a complete service has no setup problems', () => {
  assert.deepEqual(findSetupProblems(coreTypes, fullSheets), []);
});

test('missing types, empty or unbalanced sheets and uncategorised criteria are reported', () => {
  const problems = findSetupProblems(
    [coreTypes[0]],
    [...fullSheets.filter((row) => !(row.category === 'Үйлдвэрлэл' && row.sheet === 'plan')).map((row) =>
      row.category === 'Дэд бүтэц, барилга, ШТС' && row.sheet === null ? { ...row, maxScore: 90 } : row,
    ), { category: null, sheet: null, maxScore: 5, isActive: true }],
  ).map((problem) => problem.message);
  assert.ok(problems.some((message) => message.includes('Биелэлтийн тайлан') && message.includes('бүртгэгдээгүй')));
  assert.ok(problems.some((message) => message.includes('"Үйлдвэрлэл"') && message.includes('шалгуур алга')));
  assert.ok(problems.some((message) => message.includes('90')));
  assert.ok(problems.some((message) => message.includes('ангилал оноогоогүй')));
});
