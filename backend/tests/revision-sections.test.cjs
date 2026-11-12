const test = require('node:test');
const assert = require('node:assert/strict');
const { reportSections, cleanRevisionItems, applySectionFixes, filesOfSection, parseRevisionItems } = require('../../shared/reports/revisions.ts');

const PLAN = 'Жилийн төлөвлөгөө';
const PERFORMANCE = 'Биелэлтийн тайлан';
const criteria = [{ id: 'c1', name: 'Сөрөг нөлөөлөл' }, { id: 'c2', name: 'Хог хаягдал' }];
const attachments = [
  { url: 'u1', name: 'a.pdf', criterionId: 'c1' },
  { url: 'u2', name: 'b.pdf', criterionId: 'c1' },
  { url: 'u3', name: 'c.pdf', materialId: 'main-document' },
  { url: 'u4', name: 'd.jpg' },
];

test('sections follow the submit form: documents, criteria that still hold files, then other files', () => {
  const sections = reportSections({ reportType: PERFORMANCE, reportCategory: 'Үйлдвэрлэл', criteria, attachments });
  assert.deepEqual(sections.slice(0, 6).map((s) => s.key), [
    'material:main-document', 'material:annex', 'material:official-request',
    'material:state-registration-certificate', 'material:land-documents', 'criterion:c1',
  ]);
  // A criterion without files has no section: the form has no evidence rows.
  assert.ok(!sections.some((s) => s.key === 'criterion:c2'));
  assert.equal(sections.at(-1).key, 'general');
  assert.deepEqual(sections[0].files.map((f) => f.url), ['u3']);
  assert.deepEqual(sections.find((s) => s.key === 'criterion:c1').files.map((f) => f.url), ['u1', 'u2']);
  assert.deepEqual(sections.at(-1).files.map((f) => f.url), ['u4']);

  // Plans likewise list only criteria that still hold files.
  const plan = reportSections({ reportType: PLAN, reportCategory: 'Үйлдвэрлэл', criteria, attachments });
  assert.deepEqual(plan.filter((s) => s.key.startsWith('criterion:')).map((s) => s.key), ['criterion:c1']);

  // A file under a row the form no longer has keeps a section of its own.
  const old = reportSections({ reportType: PLAN, reportCategory: 'Үйлдвэрлэл', criteria: [], attachments: [{ url: 'o1', name: 'old.pdf', materialId: 'plan-checklist' }] });
  const leftover = old.find((s) => s.key === 'material:plan-checklist');
  assert.deepEqual(leftover.files.map((f) => f.url), ['o1']);
  assert.equal(leftover.group, 'Бусад');
});

test('revision items keep only known sections with a comment, labelled by the server', () => {
  const sections = [{ key: 'criterion:c1', label: 'Сөрөг нөлөөлөл' }, { key: 'general', label: 'Бусад хавсралт' }];
  const items = cleanRevisionItems(
    [
      { key: 'criterion:c1', label: 'renamed', comment: '  буруу файл ' },
      { key: 'criterion:c1', comment: 'дахин' },
      { key: 'general', comment: '' },
      { key: 'material:x', comment: 'unknown' },
    ],
    sections,
  );
  assert.deepEqual(items, [{ key: 'criterion:c1', label: 'Сөрөг нөлөөлөл', comment: 'буруу файл' }]);
  assert.deepEqual(parseRevisionItems(JSON.stringify(items)), items);
  assert.deepEqual(parseRevisionItems('not json'), []);
});

test('fixing a section replaces only its files and tags new uploads with the section', () => {
  const result = applySectionFixes(attachments, [
    { key: 'criterion:c1', keepUrls: ['u2'], added: [{ url: 'n1', name: 'new.pdf' }] },
    { key: 'general', keepUrls: [], added: [] },
  ]);
  assert.deepEqual(filesOfSection(result, 'criterion:c1').map((f) => f.url), ['u2', 'n1']);
  assert.equal(result.find((f) => f.url === 'n1').criterionId, 'c1');
  assert.deepEqual(filesOfSection(result, 'material:main-document').map((f) => f.url), ['u3']);
  assert.deepEqual(filesOfSection(result, 'general'), []);
  // A kept url that was not in the section is ignored.
  const sneaky = applySectionFixes(attachments, [{ key: 'criterion:c2', keepUrls: ['u4'], added: [] }]);
  assert.deepEqual(filesOfSection(sneaky, 'criterion:c2'), []);
});
