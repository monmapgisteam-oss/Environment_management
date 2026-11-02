const test = require('node:test');
const assert = require('node:assert/strict');
const { submissionError } = require('../lib/reports/submitValidation.ts');

const complete = {
  title: 'Төсөл',
  reportCategory: 'Үйлдвэрлэл',
  approvedDate: '2026-11-01',
  latitude: 47.9,
  longitude: 106.9,
  fileUrl: JSON.stringify([{ url: 'upload:1', name: 'plan.pdf', materialId: 'main-document' }]),
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
  const legacy = { ...complete, fileUrl: JSON.stringify([{ url: 'upload:3', name: 'old.pdf', materialId: 'plan-waste' }]) };
  assert.equal(submissionError(legacy, false), null);
});
