const test = require('node:test');
const assert = require('node:assert/strict');
const { parseAttachments } = require('../lib/reports/attachments.ts');
const { REPORT_MATERIALS, groupMaterialAttachments, materialsFor } = require('../lib/reports/materials.ts');
const { splitScoringAttachments } = require('../lib/reports/scoringAttachments.ts');
const { REPORT_CATEGORIES } = require('../lib/constants.ts');

test('every report category has its own material list with unique ids', () => {
  for (const category of REPORT_CATEGORIES) {
    const ids = materialsFor(category).map((material) => material.id);
    assert.ok(ids.length > 0, category);
    assert.equal(new Set(ids).size, ids.length, category);
  }
  assert.equal(REPORT_MATERIALS['Уул уурхай, газрын тос'].length, 16);
  assert.deepEqual(materialsFor(null), []);
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
  const groups = groupMaterialAttachments(attachments, 'Дэд бүтэц, барилга, ШТС');
  assert.deepEqual(groups.map((group) => group.material.id), ['lab-results']);
});
