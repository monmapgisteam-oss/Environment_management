const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAttachments } = require('../lib/reports/attachments.ts');
const { ANNEX, MAIN_DOCUMENT_ID, PLAN_MATERIALS, groupMaterialAttachments, leftoverMaterialGroups, materialsFor } = require('../lib/reports/materials.ts');
const { splitScoringAttachments } = require('../lib/reports/scoringAttachments.ts');
const { REPORT_CATEGORIES } = require('../lib/constants.ts');

const PLAN = 'Жилийн төлөвлөгөө';
const PERFORMANCE = 'Биелэлтийн тайлан';

test('plans and performance reports attach the document and its Хавсралт', () => {
  for (const category of REPORT_CATEGORIES) {
    assert.deepEqual(
      materialsFor(PLAN, category).map((material) => material.label),
      ['Байгаль орчны менежментийн жилийн төлөвлөгөө', 'Хавсралт'],
    );
    assert.deepEqual(
      materialsFor(PERFORMANCE, category).map((material) => material.label),
      ['Байгаль орчны менежментийн төлөвлөгөөний биелэлтийн тайлан', 'Хавсралт'],
    );
    assert.deepEqual(materialsFor(PLAN, category).map((material) => material.id), [MAIN_DOCUMENT_ID, ANNEX.id]);
  }
  assert.deepEqual(materialsFor(PERFORMANCE, null), []);
});

test('plans are made of the tables of Журмын 3 дугаар хавсралтын А хэсэг', () => {
  assert.deepEqual(
    PLAN_MATERIALS['Аялал жуулчлал, үйлчилгээ'].map((material) => material.id),
    ['plan-negative-impact', 'plan-landscaping', 'plan-heritage', 'plan-waste', 'plan-monitoring', 'plan-management', 'plan-reporting'],
  );
  // Only mining plans add rehabilitation, biodiversity offsets and resettlement.
  const miningIds = PLAN_MATERIALS['Уул уурхай, газрын тос'].map((material) => material.id);
  assert.ok(miningIds.includes('plan-rehabilitation'));
  assert.ok(miningIds.includes('plan-biodiversity'));
  assert.ok(miningIds.includes('plan-resettlement'));
  for (const category of REPORT_CATEGORIES) {
    for (const material of PLAN_MATERIALS[category]) assert.match(material.label, /(төлөвлөгөө|хөтөлбөр)( \/.*\/)?$/);
  }
});

test('material files keep their id and stay out of the general list', () => {
  const stored = JSON.stringify([
    { url: '/a.jpg', name: 'a.jpg' },
    { url: '/b.pdf', name: 'b.pdf', criterionId: 'c1' },
    { url: '/c.pdf', name: 'c.pdf', materialId: 'main-document' },
    { url: '/d.pdf', name: 'd.pdf', materialId: 'lab-results' },
  ]);
  const attachments = parseAttachments(stored);
  assert.equal(attachments[2].materialId, 'main-document');

  const { reportAttachments, criterionAttachments } = splitScoringAttachments(attachments, [{ id: 'c1' }]);
  assert.deepEqual(reportAttachments.map((file) => file.name), ['a.jpg']);
  assert.deepEqual(criterionAttachments.c1.map((file) => file.name), ['b.pdf']);

  // Files under a row of the older per-table lists show as a leftover row.
  const groups = groupMaterialAttachments(attachments, PERFORMANCE, 'Дэд бүтэц, барилга, ШТС');
  assert.deepEqual(groups.map((group) => group.material.id), ['main-document']);
  const leftover = leftoverMaterialGroups(attachments, PERFORMANCE, 'Дэд бүтэц, барилга, ШТС');
  assert.deepEqual(leftover.map((group) => [group.material.id, group.material.label]), [['lab-results', 'Өмнөх хавсралт 1']]);
});

test('each plan criterion shows the files of its plan document row', () => {
  const { scoringAttachmentsFor, planMaterialForCriterion } = require('../lib/reports/scoringAttachments.ts');
  assert.equal(planMaterialForCriterion('Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөө'), 'plan-landscaping');
  assert.equal(planMaterialForCriterion('Нөхөн сэргээлтийн төлөвлөгөө /техникийн нөхөн сэргээлт/'), 'plan-rehabilitation');
  assert.equal(planMaterialForCriterion('Аймаг, сумын ... оршин суугчдад тайлагнах төлөвлөгөө'), 'plan-reporting');
  const files = [
    { url: 'a', name: 'a.pdf', materialId: 'plan-waste' },
    { url: 'b', name: 'b.pdf', materialId: 'main-document' },
    { url: 'c', name: 'c.pdf' },
  ];
  const plan = scoringAttachmentsFor(files, [{ id: 'w', name: 'Хог, хаягдлын менежментийн төлөвлөгөө', sheet: 'plan' }]);
  assert.deepEqual(plan.criterionAttachments.w.map((f) => f.url), ['a']);
  assert.deepEqual(plan.reportAttachments.map((f) => f.url), ['c']);
  // Criteria of the performance sheet keep the evidence uploaded per criterion.
  const perf = scoringAttachmentsFor([{ url: 'd', name: 'd.pdf', criterionId: 'p' }], [{ id: 'p', name: 'Хог, хаягдлын ... биелэлт' }]);
  assert.deepEqual(perf.criterionAttachments.p.map((f) => f.url), ['d']);
});
