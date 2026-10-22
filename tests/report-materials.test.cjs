const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAttachments } = require('../lib/reports/attachments.ts');
const { PLAN_MATERIALS, REPORT_MATERIALS, groupMaterialAttachments, materialsFor } = require('../lib/reports/materials.ts');
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
  assert.deepEqual(materialsFor(PERFORMANCE, null), []);
});

test('plans list the documents of Журмын 5 дугаар хавсралтын А хэсэг', () => {
  assert.equal(materialsFor(PLAN, 'Үйлдвэрлэл'), PLAN_MATERIALS['Үйлдвэрлэл']);
  assert.deepEqual(
    materialsFor(PLAN, 'Үйлдвэрлэл').map((material) => material.id),
    ['plan-company-certificate', 'plan-license-copy', 'plan-checklist', 'plan-no-operation-statement', 'plan-document'],
  );
  // Only mining plans add the mining work plan forms and the protected area reference.
  const miningIds = materialsFor(PLAN, 'Уул уурхай, газрын тос').map((material) => material.id);
  assert.ok(miningIds.includes('plan-mining-work-plan'));
  assert.ok(miningIds.includes('plan-protected-area-reference'));
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
