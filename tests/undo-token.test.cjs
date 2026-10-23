const test = require('node:test');
const assert = require('node:assert/strict');

process.env.JWT_SECRET ||= 'test-secret';
const { createUndoToken, undoAction, UndoError } = require('../lib/reports/undo.ts');

const action = { kind: 'return-dismiss', reportId: 'r1', prev: { status: 'return_requested', returnReason: 'x', returnRequestedBy: 'A' } };

test('only the user who acted can undo, and only with a genuine token', async () => {
  const token = createUndoToken(action, 'u1', new Date('2026-10-23T00:00:00Z'));
  await assert.rejects(undoAction(token, 'u2'), (error) => error instanceof UndoError && error.status === 403);
  await assert.rejects(undoAction(`${token}x`, 'u1'), (error) => error instanceof UndoError && error.status === 400);
  await assert.rejects(undoAction(undefined, 'u1'), (error) => error instanceof UndoError && error.status === 400);
});
