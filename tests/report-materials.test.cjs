const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAttachments } = require('../lib/reports/attachments.ts');
const { PLAN_MATERIALS, PROJECT_INTRO, REPORT_MATERIALS, groupMaterialAttachments, materialsFor } = require('../lib/reports/materials.ts');
const { splitScoringAttachments } = require('../lib/reports/scoringAttachments.ts');
const { REPORT_CATEGORIES } = require('../lib/constants.ts');

const PLAN = 'Жилийн төлөвлөгөө';
const PERFORMANCE = 'Биелэлтийн тайлан';

test('every report category has its own material list with unique ids', () => {
  for (const reportType of [PLAN, PERFORMANCE]) {
    for (const category of REPORT_CATEGORIES) {
      const ids = materialsFor(reportType, category).map((material) => material.id);
      assert.ok(ids.length > 0, `${reportType}: ${category}`);
      assert.equal(new Set(ids).size, ids.length, `${reportType}: ${category}`);
    }
  }
  assert.equal(REPORT_MATERIALS['Уул уурхай, газрын тос'].length, 16);
  assert.equal(materialsFor(PERFORMANCE, 'Уул уурхай, газрын тос').length, 17);
  assert.deepEqual(materialsFor(PERFORMANCE, null), []);
});

test('every plan and performance report starts with the project introduction', () => {
  for (const reportType of [PLAN, PERFORMANCE]) {
    for (const category of REPORT_CATEGORIES) {
      assert.equal(materialsFor(reportType, category)[0], PROJECT_INTRO, `${reportType}: ${category}`);
    }
  }
  assert.equal(PROJECT_INTRO.label, 'Төслийн товч танилцуулга');
});

test('plans list the tables of Журмын 3 дугаар хавсралтын А хэсэг', () => {
  assert.deepEqual(materialsFor(PLAN, 'Үйлдвэрлэл').slice(1), PLAN_MATERIALS['Үйлдвэрлэл']);
  assert.deepEqual(
    materialsFor(PLAN, 'Аялал жуулчлал, үйлчилгээ').map((material) => material.id),
    [
      'project-intro',
      'plan-negative-impact',
      'plan-landscaping',
      'plan-heritage',
      'plan-waste',
      'plan-monitoring',
      'plan-management',
      'plan-reporting',
    ],
  );
  // Only mining plans add rehabilitation, biodiversity offsets and resettlement.
  const miningIds = materialsFor(PLAN, 'Уул уурхай, газрын тос').map((material) => material.id);
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
    { url: '/c.jpg', name: 'c.jpg', materialId: 'lab-results' },
    { url: '/d.jpg', name: 'd.jpg', materialId: 'water-supply-act' },
  ]);
  const attachments = parseAttachments(stored);
  assert.equal(attachments[2].materialId, 'lab-results');

  const { reportAttachments, criterionAttachments } = splitScoringAttachments(attachments, [{ id: 'c1' }]);
  assert.deepEqual(reportAttachments.map((file) => file.name), ['a.jpg']);
  assert.deepEqual(criterionAttachments.c1.map((file) => file.name), ['b.pdf']);

  // Only materials of the report's own category are shown.
  const groups = groupMaterialAttachments(attachments, PERFORMANCE, 'Дэд бүтэц, барилга, ШТС');
  assert.deepEqual(groups.map((group) => group.material.id), ['lab-results']);
});

test('each plan criterion shows the files of its plan document row', () => {
  const { scoringAttachmentsFor, planMaterialForCriterion } = require('../lib/reports/scoringAttachments.ts');
  assert.equal(planMaterialForCriterion('Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөө'), 'plan-landscaping');
  assert.equal(planMaterialForCriterion('Нөхөн сэргээлтийн төлөвлөгөө /техникийн нөхөн сэргээлт/'), 'plan-rehabilitation');
  assert.equal(planMaterialForCriterion('Аймаг, сумын ... оршин суугчдад тайлагнах төлөвлөгөө'), 'plan-reporting');
  const files = [
    { url: 'a', name: 'a.pdf', materialId: 'plan-waste' },
    { url: 'b', name: 'b.pdf', materialId: 'project-intro' },
    { url: 'c', name: 'c.pdf' },
  ];
  const plan = scoringAttachmentsFor(files, [{ id: 'w', name: 'Хог, хаягдлын менежментийн төлөвлөгөө', sheet: 'plan' }]);
  assert.deepEqual(plan.criterionAttachments.w.map((f) => f.url), ['a']);
  assert.deepEqual(plan.reportAttachments.map((f) => f.url), ['c']);
  // Criteria of the performance sheet keep the evidence uploaded per criterion.
  const perf = scoringAttachmentsFor([{ url: 'd', name: 'd.pdf', criterionId: 'p' }], [{ id: 'p', name: 'Хог, хаягдлын ... биелэлт' }]);
  assert.deepEqual(perf.criterionAttachments.p.map((f) => f.url), ['d']);
});
