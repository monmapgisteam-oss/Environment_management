const test = require('node:test');
const assert = require('node:assert/strict');
const schema = require('../lib/db/schema.json');
const { planMigration } = require('../scripts/convex-migration-plan.cjs');

const empty = () => Object.fromEntries(Object.keys(schema).map((model) => [model, []]));
let sequence = 0;
function row(model, overrides) {
  const n = ++sequence;
  const result = Object.fromEntries(Object.entries(schema[model].fields).map(([key, field]) => [key,
    field.nullable ? null : field.default === 'now' ? 1000 : field.default === 'uuid' ? `${model}-${n}` :
      field.default !== undefined ? field.default : field.values ? field.values[0] : field.type === 'string' ? `${key}-${n}` : field.type === 'boolean' ? true : 0,
  ]));
  return { ...result, ...overrides };
}

function fixture() {
  const source = empty();
  const target = empty();
  source.company.push(row('company', { id: 'source-company', registerNumber: 'same-register' }));
  target.company.push(row('company', { id: 'old-company', registerNumber: 'same-register' }));
  source.user.push(row('user', { id: 'source-user', email: 'same@example.test', companyId: 'source-company' }));
  target.user.push(row('user', { id: 'old-user', email: 'same@example.test', companyId: 'old-company' }));
  source.reportType.push(row('reportType', { id: 'source-type', slug: 'type-1' }));
  target.reportType.push(row('reportType', { id: 'old-type', slug: 'type-1' }));
  source.report.push(row('report', { id: 'source-report', reportNumber: 'S123-1', reportTypeId: 'source-type', senderCompanyId: 'source-company', year: 2026 }));
  target.report.push(row('report', { id: 'old-report', reportNumber: 'S123-1', reportTypeId: 'old-type', senderCompanyId: 'old-company', year: 2026 }));
  return { source, target };
}

test('migration merges natural identities but retains both reports and every attachment ID', () => {
  const { source, target } = fixture();
  source.upload.push(row('upload', { id: 'source-upload', ownerUserId: 'source-user', storageId: 'arcgis-attachment' }));
  target.upload.push(row('upload', { id: 'old-upload', ownerUserId: 'old-user', storageId: 'convex-storage' }));
  target.report[0].fileUrl = '[{"url":"convex-upload:old-upload","name":"old.pdf"}]';
  const plan = planMigration(source, target);
  assert.equal(plan.tables.company.length, 1);
  assert.equal(plan.tables.user.length, 1);
  assert.equal(plan.tables.reportType.length, 1);
  assert.equal(plan.tables.report.length, 2);
  assert.equal(plan.tables.upload.length, 2);
  const old = plan.tables.report.find((r) => r.id === 'old-report');
  assert.equal(old.reportTypeId, 'source-type');
  assert.equal(old.senderCompanyId, 'source-company');
  assert.equal(old.reportNumber, 'RPT-2026-0001');
  assert.ok(old.fileUrl.includes('upload:old-upload'));
  assert.equal(plan.tables.upload.find((r) => r.id === 'old-upload').ownerUserId, 'source-user');
  assert.deepEqual(plan.removeIds.user, ['old-user']);
  assert.equal(source.report[0].reportNumber, 'S123-1');
  assert.equal(target.report[0].reportNumber, 'S123-1');
});

test('historical scoring criteria and signed evaluation fingerprints survive the merge', () => {
  const { source, target } = fixture();
  target.user[0].email = 'different@example.test';
  source.evaluationCriterion.push(row('evaluationCriterion', { id: 'new-criterion', category: 'Үйлдвэрлэл', isActive: true }));
  target.evaluationCriterion.push(row('evaluationCriterion', { id: 'old-criterion', category: 'Үйлдвэрлэл', isActive: true }));
  target.reportAssignment.push(row('reportAssignment', { id: 'old-assignment', reportId: 'old-report', evaluatorUserId: 'old-user', assignedByUserId: 'old-user' }));
  target.evaluation.push(row('evaluation', { id: 'old-evaluation', assignmentId: 'old-assignment', reportId: 'old-report', status: 'SIGNED', documentHash: 'original-signed-fingerprint', signature: 'legacy-plaintext-pin' }));
  target.evaluationScore.push(row('evaluationScore', { evaluationId: 'old-evaluation', criterionId: 'old-criterion', score: 7 }));
  const plan = planMigration(source, target);
  assert.equal(plan.tables.evaluationCriterion.find((r) => r.id === 'old-criterion').isActive, false);
  assert.equal(plan.tables.evaluationCriterion.find((r) => r.id === 'new-criterion').isActive, true);
  assert.equal(plan.tables.evaluation[0].documentHash, 'original-signed-fingerprint');
  assert.equal(plan.tables.evaluation[0].assignmentId, 'old-assignment');
  assert.equal(plan.tables.evaluationScore[0].criterionId, 'old-criterion');
  assert.equal(plan.tables.evaluation[0].signature, null);
});

test('migration refuses to silently remap a signed evaluator or invent missing relations', () => {
  const { source, target } = fixture();
  target.reportAssignment.push(row('reportAssignment', { id: 'a', reportId: 'old-report', evaluatorUserId: 'old-user', assignedByUserId: 'old-user' }));
  target.evaluation.push(row('evaluation', { assignmentId: 'a', reportId: 'old-report', status: 'SIGNED' }));
  assert.throws(() => planMigration(source, target), /signed evaluator identity/);
  target.evaluation = [];
  target.reportAssignment[0].evaluatorUserId = 'missing-user';
  assert.throws(() => planMigration(source, target), /Missing relation/);
});
