const test = require('node:test');
const assert = require('node:assert/strict');
const { submissionError } = require('../lib/reports/submitValidation.ts');
const { REQUIRED_ANNEX_MATERIALS, missingAnnexMaterial } = require('../lib/reports/materials.ts');
const { applySectionFixes } = require('../lib/reports/revisions.ts');

const requiredFiles = [
  { url: 'upload:1', name: 'plan.pdf', materialId: 'main-document' },
  ...REQUIRED_ANNEX_MATERIALS.map((material, index) => ({ url: `upload:annex-${index}`, name: `${material.id}.pdf`, materialId: material.id })),
];

const complete = {
  title: 'Төсөл',
  reportCategory: 'Үйлдвэрлэл',
  approvedDate: '2026-11-01',
  latitude: 47.9,
  longitude: 106.9,
  fileUrl: JSON.stringify(requiredFiles),
};

test('a complete report can be sent', () => {
  assert.equal(submissionError(complete), null);
});

test('a report without its main document, category, date or pin is refused', () => {
  assert.match(submissionError({ ...complete, fileUrl: JSON.stringify([{ url: 'upload:2', name: 'a.pdf', materialId: 'annex' }]) }), /Үндсэн баримт/);
  assert.match(submissionError({ ...complete, reportCategory: '' }), /ангилл/);
  assert.match(submissionError({ ...complete, approvedDate: '' }), /огноо/);
  assert.match(submissionError({ ...complete, latitude: null }), /байршл/);
  assert.match(submissionError({ ...complete, title: '  ' }), /нэр/);
});

test('reports filed under the older document lists may be resent without a main document', () => {
  const legacy = { ...complete, fileUrl: JSON.stringify([
    ...requiredFiles.filter((file) => file.materialId !== 'main-document'),
    { url: 'upload:3', name: 'old.pdf', materialId: 'plan-waste' },
  ]) };
  assert.equal(submissionError(legacy, false), null);
});

test('each named annex document is required even when a generic annex is attached', () => {
  for (const material of REQUIRED_ANNEX_MATERIALS) {
    const fileUrl = JSON.stringify([
      ...requiredFiles.filter((file) => file.materialId !== material.id),
      { url: 'upload:generic', name: 'annex.pdf', materialId: 'annex' },
    ]);
    assert.ok(submissionError({ ...complete, fileUrl }).includes(material.label));
    assert.ok(submissionError({ ...complete, fileUrl }, false).includes(material.label));
  }
});

test('a required annex may be replaced during revision but cannot be removed', () => {
  for (const material of REQUIRED_ANNEX_MATERIALS) {
    const fix = { key: `material:${material.id}`, keepUrls: [], added: [] };
    assert.equal(missingAnnexMaterial(applySectionFixes(requiredFiles, [fix])).id, material.id);
    fix.added = [{ url: 'upload:replacement', name: 'replacement.pdf' }];
    const replaced = applySectionFixes(requiredFiles, [fix]);
    assert.equal(missingAnnexMaterial(replaced), undefined);
    assert.equal(submissionError({ ...complete, fileUrl: JSON.stringify(replaced) }), null);
  }
});
