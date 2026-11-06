const test = require('node:test');
const assert = require('node:assert/strict');
const { canTransition, signingProgress, statusFromEvaluations } = require('../lib/reports/transitions.ts');

const signed = { status: 'SIGNED', signatureStatus: 'VERIFIED' };

test('each action starts only from the statuses it can act on', () => {
  assert.ok(canTransition('submitted', 'assign'));
  assert.ok(!canTransition('needs_revision', 'assign'));
  assert.ok(!canTransition('approved', 'assign'));
  assert.ok(canTransition('in_review', 'evaluate'));
  assert.ok(!canTransition('return_requested', 'evaluate'));
  assert.ok(!canTransition('completed', 'returnRequest'));
  assert.ok(!canTransition('completed', 'returnToSender'));
  assert.ok(canTransition('return_requested', 'returnToSender'));
  assert.ok(canTransition('completed', 'approve'));
  assert.ok(!canTransition('in_review', 'approve'));
});

test('a dismissed return request goes back to what the evaluations say', () => {
  assert.equal(statusFromEvaluations([]), 'submitted');
  assert.equal(statusFromEvaluations([{ evaluatorUserId: 'a' }]), 'assigned');
  assert.equal(statusFromEvaluations([{ evaluatorUserId: 'a', evaluation: signed }, { evaluatorUserId: 'b' }]), 'in_review');
  assert.equal(statusFromEvaluations([{ evaluatorUserId: 'a', evaluation: signed }]), 'completed');
});

test('signing progress counts each evaluator once', () => {
  const progress = signingProgress([
    { evaluatorUserId: 'a', evaluation: signed },
    { evaluatorUserId: 'a' },
    { evaluatorUserId: 'b' },
  ]);
  assert.deepEqual(progress, { total: 2, signed: 1, anyScored: true, allSigned: false });
});

test('an early manager score stays in review and does not count as a completed committee', () => {
  const manager = { evaluatorUserId: 'm', evaluator: { id: 'm', role: 'review_manager' }, evaluation: signed };
  const member = { evaluatorUserId: 'a', evaluator: { id: 'a', role: 'evaluator' } };
  assert.equal(statusFromEvaluations([manager]), 'in_review');
  assert.equal(statusFromEvaluations([manager, member]), 'in_review');
  assert.ok(canTransition(statusFromEvaluations([manager]), 'assign'));
  assert.equal(statusFromEvaluations([manager, { ...member, evaluation: signed }]), 'completed');
  assert.equal(statusFromEvaluations([{ ...manager, evaluation: null }, { ...member, evaluation: signed }]), 'completed');
});
