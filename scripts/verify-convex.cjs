// Live smoke check. Creates and removes only its own temporary upload; report
// data is read-only. No names, credentials, or attachment tokens are printed.
require('./register-typescript.cjs');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const store = require('../lib/db/index.ts').default;
const storage = require('../lib/db/storage.ts');
const { hit } = require('../lib/db/rateLimit.ts');
const { loadSetupProblems } = require('../lib/setupCheck.ts');

async function main() {
  const problems = await loadSetupProblems();
  assert.equal(problems.length, 0, 'Core types or scoring sheets are incomplete.');
  const reports = await store.report.findMany({ include: {
    senderCompany: true, reportType: true, location: true,
    assignments: { include: { evaluator: true, evaluation: { include: { scores: { include: { criterion: true } } } } } },
  } });
  for (const report of reports) {
    assert.ok(report.senderCompany && report.reportType);
    assert.ok(report.createdAt instanceof Date);
    for (const assignment of report.assignments) {
      assert.ok(assignment.evaluator);
      for (const score of assignment.evaluation?.scores || []) assert.ok(score.criterion);
    }
  }
  console.log(`Live joins/date conversion: ${reports.length} reports passed; reference setup complete.`);

  const key = `convex-cutover-smoke:${crypto.randomUUID()}`;
  const attempts = await Promise.all([hit(key, 2, 60_000), hit(key, 2, 60_000), hit(key, 2, 60_000)]);
  assert.equal(attempts.filter((attempt) => attempt.ok).length, 2);
  assert.equal((await hit(key, 2, 60_000, { count: false })).ok, false);
  console.log('Concurrent rate limiting: exactly 2/3 allowed, subsequent check blocked.');

  const owner = await store.user.findFirst({ where: { role: 'admin' } });
  assert.ok(owner, 'No admin account exists.');
  const bytes = Buffer.from('%PDF-1.4\n% Convex storage smoke check\n%%EOF');
  let uploaded;
  try {
    uploaded = await storage.uploadAttachment(new File([bytes], 'convex-cutover-smoke.pdf', { type: 'application/pdf' }), owner.id);
    const url = await storage.createSignedUrl(uploaded.url);
    assert.equal(storage.verifyAttachmentToken(new URL(url, 'http://localhost').searchParams.get('token')), uploaded.url);
    const response = await storage.fetchAttachment(uploaded.url);
    assert.ok(Buffer.from(await response.arrayBuffer()).equals(bytes));
    console.log('Live upload, authenticated metadata, signed application link, and private download passed.');
  } finally {
    if (uploaded) {
      await storage.deleteUploads([uploaded.url]);
      assert.equal(await store.upload.findUnique({ where: { id: uploaded.url.slice('upload:'.length) } }), null);
    }
  }
  const denied = await fetch(`${process.env.CONVEX_URL}/api/query`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: 'data:read', args: { secret: 'incorrect-smoke-secret', model: 'user', op: 'findMany', args: {} }, format: 'json' }),
  });
  assert.equal((await denied.json()).status, 'error');
  console.log('Unauthenticated database access rejected; temporary upload cleaned up.');
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
