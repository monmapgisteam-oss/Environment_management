const test = require('node:test');
const assert = require('node:assert/strict');
const { scoresReleased, senderStatus } = require('../lib/reports/scoreRelease.ts');
const { generateSignatureId, generateSignaturePin, SIGNATURE_PIN_LENGTH } = require('../lib/auth/signature.ts');

test('scores reach the sender only after the manager signs them off', () => {
  const scored = { status: 'completed', scoresApprovedAt: null, signedScanUrl: null };
  assert.equal(scoresReleased(scored), false);
  assert.equal(senderStatus(scored), 'in_review');

  const approved = { status: 'approved', scoresApprovedAt: new Date(), signedScanUrl: null };
  assert.equal(scoresReleased(approved), true);
  assert.equal(senderStatus(approved), 'approved');

  // Reports finished before the approval step: the sent scan released them.
  const legacy = { status: 'completed', scoresApprovedAt: null, signedScanUrl: 'upload:scan.pdf' };
  assert.equal(scoresReleased(legacy), true);
  assert.equal(senderStatus(legacy), 'completed');

  assert.equal(senderStatus({ status: 'needs_revision' }), 'needs_revision');
});

test('signature passwords are generated digits and approvals get their own id prefix', () => {
  for (let i = 0; i < 20; i += 1) {
    assert.match(generateSignaturePin(), new RegExp(`^\\d{${SIGNATURE_PIN_LENGTH}}$`));
  }
  const at = new Date(Date.UTC(2026, 9, 27));
  assert.equal(generateSignatureId(3, at), 'SIG-20261027-00003');
  assert.equal(generateSignatureId(3, at, 'BAT'), 'BAT-20261027-00003');
});
