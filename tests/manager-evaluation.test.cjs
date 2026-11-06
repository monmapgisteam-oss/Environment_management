const test = require('node:test');
const assert = require('node:assert/strict');
const { managerEvaluationState, managerScoringError } = require('../lib/reports/managerEvaluation.ts');
const auth = require('../lib/auth/index.ts');
const store = require('../lib/db/index.ts').default;
const signatures = require('../lib/auth/signature.ts');
const criteria = require('../lib/reports/criteria.ts');
const undo = require('../lib/reports/undo.ts');
const companies = require('../lib/reports/companies.ts');
const { POST: submitEvaluation } = require('../app/api/evaluations/submit/route.ts');
const { POST: approveScores } = require('../app/api/reports/[id]/approve-scores/route.ts');

const signed = (totalScore = 8) => ({
  status: 'SIGNED', signatureStatus: 'VERIFIED', totalScore,
  scores: [{ criterionId: 'c1', score: Math.min(5, totalScore), note: 'Үндэслэл 1' }, { criterionId: 'c2', score: totalScore - Math.min(5, totalScore), note: 'Үндэслэл 2' }],
});
const member = (id, evaluation = signed()) => ({
  id: `assignment-${id}`, evaluatorUserId: id, evaluator: { id, role: 'evaluator', name: id }, evaluation,
});
const manager = { id: 'manager', role: 'review_manager', name: 'Manager', signaturePinHash: 'hashed-pin' };
const managerAssignment = (evaluation) => ({
  id: 'assignment-manager', evaluatorUserId: manager.id, evaluator: manager, evaluation,
});

test('a manager scores independently of committee progress; their own sheet is separate', () => {
  const assignments = [member('a'), member('b', null)];
  assert.equal(managerScoringError('in_review', assignments, manager.id, false), null);
  assert.equal(managerScoringError('submitted', [], manager.id, false), null);
  assert.equal(managerScoringError('assigned', [member('a', null)], manager.id, false), null);
  assert.equal(managerScoringError('completed', [], manager.id, false), null);
  assignments[1].evaluation = signed();
  assert.equal(managerScoringError('completed', assignments, manager.id, false), null);
  assert.equal(managerEvaluationState(assignments, manager.id).ownAssignment, undefined);
  assignments.push(managerAssignment(null));
  assert.equal(managerScoringError('in_review', assignments, manager.id, false), null);
  assert.equal(managerEvaluationState(assignments, manager.id).members.length, 2);
  assignments.at(-1).evaluation = signed(10);
  assert.equal(managerEvaluationState(assignments, manager.id).ownAssignment.evaluation.totalScore, 10);
  assert.match(managerScoringError('completed', assignments, manager.id, false), /засах боломжгүй/);
  for (const status of ['draft', 'needs_revision', 'return_requested', 'approved', 'rejected']) {
    assert.ok(managerScoringError(status, assignments, manager.id, false));
  }
  assert.ok(managerScoringError('completed', [member('a')], manager.id, true));
});

function setup(t, { assignments = [member('a'), member('b')], status = 'completed', pinError = null, currentUser = manager } = {}) {
  t.after(() => t.mock.restoreAll());
  const report = {
    id: 'report', reportNumber: 'BOMT-1', title: 'Төсөл', reportCategory: 'Үйлдвэрлэл',
    reportType: { name: 'Жилийн төлөвлөгөө', slug: 'type-1' },
    status, finalScore: 8, scoresApprovedAt: null, updatedAt: new Date(), assignments,
  };
  t.mock.method(auth, 'getApiUser', async () => currentUser);
  t.mock.method(auth, 'canAccessReport', async () => true);
  t.mock.method(store.report, 'findUnique', async () => report);
  t.mock.method(store.report, 'count', async () => 0);
  t.mock.method(store.report, 'findFirst', async () => null);
  const reportUpdate = t.mock.method(store.report, 'update', async ({ data }) => {
    Object.assign(report, data);
    return report;
  });
  t.mock.method(store.reportAssignment, 'findMany', async ({ where }) =>
    where.evaluatorUserId ? assignments.filter((a) => a.evaluatorUserId === where.evaluatorUserId) : assignments);
  t.mock.method(store.reportAssignment, 'findFirst', async ({ where }) =>
    assignments.find((a) => a.evaluatorUserId === where.evaluatorUserId && a.evaluation?.status === 'SIGNED') ?? null);
  const assignmentCreate = t.mock.method(store.reportAssignment, 'create', async ({ data }) => {
    const assignment = { ...managerAssignment(null), ...data };
    assignments.push(assignment);
    return assignment;
  });
  t.mock.method(store.reportAssignment, 'update', async ({ where, data }) => {
    const assignment = assignments.find((a) => a.id === where.id);
    Object.assign(assignment, data);
    return assignment;
  });
  t.mock.method(store.evaluation, 'count', async () => 0);
  t.mock.method(store.evaluation, 'findUnique', async () => null);
  const evaluationCreate = t.mock.method(store.evaluation, 'create', async ({ data }) => {
    const evaluation = { id: 'manager-evaluation', ...data };
    assignments.find((a) => a.id === data.assignmentId).evaluation = evaluation;
    return evaluation;
  });
  t.mock.method(store.user, 'findMany', async () => [manager]);
  const pinCheck = t.mock.method(signatures, 'checkPinWithLimit', async () => pinError);
  t.mock.method(criteria, 'fetchCriteriaForReport', async () => [{ id: 'c1', maxScore: 5 }, { id: 'c2', maxScore: 5 }]);
  const notifications = t.mock.method(undo, 'createNotifications', async () => []);
  t.mock.method(undo, 'createUndoToken', () => 'test-undo');
  t.mock.method(companies, 'senderRecipientIds', async () => ['sender']);
  return { report, reportUpdate, assignmentCreate, evaluationCreate, pinCheck, notifications };
}

function evaluationRequest(overrides = {}) {
  return new Request('http://localhost/api/evaluations/submit', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reportId: 'report', scores: { c1: 4, c2: 5 }, notes: { c1: 'Үндэслэл 1', c2: 'Үндэслэл 2' }, signature: '123456', ...overrides }),
  });
}

test('a manager can sign before the remaining member; final approval still waits for that member', async (t) => {
  const state = setup(t, { assignments: [member('a'), member('b', null)], status: 'in_review' });
  const response = await submitEvaluation(evaluationRequest());
  assert.equal(response.status, 201);
  assert.equal(state.assignmentCreate.mock.callCount(), 1);
  assert.equal(state.evaluationCreate.mock.callCount(), 1);
  assert.equal(state.report.status, 'in_review');
  assert.equal(state.report.finalScore, null);
  assert.equal(state.report.assignments[1].evaluation, null);
  const prematureApproval = await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) });
  assert.equal(prematureApproval.status, 400);
  assert.equal(state.report.scoresApprovedAt, null);

  auth.getApiUser.mock.mockImplementation(async () => ({ id: 'b', role: 'evaluator', name: 'Member B', signaturePinHash: 'hashed-pin' }));
  assert.equal((await submitEvaluation(evaluationRequest({ scores: { c1: 4, c2: 4 } }))).status, 201);
  assert.equal(state.report.finalScore, 8.3);
  assert.equal(state.report.status, 'completed');
  assert.ok(state.notifications.mock.calls.some(({ arguments: [rows] }) =>
    rows.some((row) => row.userId === manager.id && row.title === 'Үнэлгээ батлахыг хүлээж байна')));
  auth.getApiUser.mock.mockImplementation(async () => manager);
  assert.equal((await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) })).status, 200);
});

test('a manager can score before any staff are assigned without completing or releasing the report', async (t) => {
  const state = setup(t, { assignments: [], status: 'submitted' });
  assert.equal((await submitEvaluation(evaluationRequest())).status, 201);
  assert.equal(state.report.status, 'in_review');
  assert.equal(state.report.finalScore, null);
  assert.equal(state.report.scoresApprovedAt, null);
  assert.equal(managerEvaluationState(state.report.assignments, manager.id).members.length, 0);
});

test('the last member signing opens manager scoring without releasing scores to the sender', async (t) => {
  const currentUser = { id: 'b', name: 'Member B', role: 'evaluator', signaturePinHash: 'hashed-pin' };
  const state = setup(t, { assignments: [member('a'), member('b', null)], status: 'in_review', currentUser });
  const response = await submitEvaluation(evaluationRequest());
  assert.equal(response.status, 201);
  assert.equal(state.report.status, 'completed');
  assert.equal(state.assignmentCreate.mock.callCount(), 0);
  assert.equal(state.report.scoresApprovedAt, null);
  assert.ok(state.notifications.mock.calls.some(({ arguments: [rows] }) =>
    rows.some((row) => row.userId === manager.id && row.title === 'Менежерийн үнэлгээ хүлээж байна')));
  assert.equal(managerScoringError(state.report.status, state.report.assignments, manager.id, false), null);
});

test('a manager signs their own evaluation after members finish and joins the final average', async (t) => {
  const state = setup(t);
  const response = await submitEvaluation(evaluationRequest());
  assert.equal(response.status, 201);
  const result = await response.json();
  assert.equal(result.signatureStatus, 'VERIFIED');
  assert.match(result.signatureId, /^SIG-/);
  assert.equal(state.assignmentCreate.mock.calls[0].arguments[0].data.evaluatorUserId, manager.id);
  const saved = state.evaluationCreate.mock.calls[0].arguments[0].data;
  assert.equal(saved.totalScore, 9);
  assert.equal(saved.signature, null);
  assert.equal(saved.status, 'SIGNED');
  assert.equal(saved.documentHash.length, 64);
  assert.equal(saved.scores.create.length, 2);
  assert.equal(state.report.finalScore, 8.3);
  assert.equal(state.report.status, 'completed');
  assert.equal(state.report.scoresApprovedAt, null);
  const repeated = await submitEvaluation(evaluationRequest());
  assert.equal(repeated.status, 409);
  assert.equal(state.assignmentCreate.mock.callCount(), 1);
  assert.equal(state.evaluationCreate.mock.callCount(), 1);
});

test('invalid signatures and incomplete criteria leave no manager assignment or score', async (t) => {
  const state = setup(t, { pinError: 'Нууц үг буруу' });
  const incomplete = await submitEvaluation(evaluationRequest({ scores: { c1: 4 } }));
  assert.equal(incomplete.status, 400);
  assert.equal(state.pinCheck.mock.callCount(), 0);
  const badPin = await submitEvaluation(evaluationRequest());
  assert.equal(badPin.status, 400);
  assert.equal((await badPin.json()).error, 'Нууц үг буруу');
  assert.equal(state.assignmentCreate.mock.callCount(), 0);
  assert.equal(state.evaluationCreate.mock.callCount(), 0);
});

const approvalRequest = () => new Request('http://localhost/api/reports/report/approve-scores', {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ signature: '123456' }),
});

test('a manager cannot approve or release scores without their own signed evaluation', async (t) => {
  const state = setup(t);
  const response = await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) });
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /өөрийн үнэлгээг/);
  assert.equal(state.reportUpdate.mock.callCount(), 0);
  assert.equal(state.pinCheck.mock.callCount(), 0);
});

test('final approval releases scores only after the manager scores and signs', async (t) => {
  const state = setup(t);
  assert.equal((await submitEvaluation(evaluationRequest())).status, 201);
  const response = await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) });
  assert.equal(response.status, 200);
  assert.equal(state.report.status, 'approved');
  assert.equal(state.report.scoresApprovedById, manager.id);
  assert.match(state.report.scoresApprovalSignatureId, /^BAT-/);
  assert.equal(state.report.scoresApprovalDocumentHash.length, 64);
  assert.ok(state.report.scoresApprovedAt);
  assert.ok(state.notifications.mock.calls.some(({ arguments: [rows] }) => rows.some((row) => row.userId === 'sender')));
});

test('another manager cannot approve using a colleague’s signed evaluation', async (t) => {
  const colleague = { ...managerAssignment(signed(9)), evaluatorUserId: 'other-manager', evaluator: { ...manager, id: 'other-manager' } };
  const state = setup(t, { assignments: [member('a'), colleague] });
  const response = await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) });
  assert.equal(response.status, 400);
  assert.equal(state.reportUpdate.mock.callCount(), 0);
});

// Load the actual server page to protect against borrowing the latest member's
// signed evaluation, which used to lock the manager out of their own sheet.
require.extensions['.tsx'] = (module, filename) => {
  const ts = require('typescript');
  const source = require('node:fs').readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
    fileName: filename,
  });
  module._compile(compiled.outputText, filename);
};
const ReviewerEvaluatePage = require('../app/reviewer/evaluate/[id]/page.tsx').default;
const EvaluationTable = require('../components/evaluation/EvaluationTable.tsx').default;
const storage = require('../lib/db/storage.ts');

function findTable(node) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.map(findTable).find(Boolean) ?? null;
  return node.type === EvaluationTable ? node : findTable(node.props?.children);
}

test('the manager page starts with blank own scores after members sign, then locks only their own signed scores', async (t) => {
  const state = setup(t);
  state.report.senderCompany = { name: 'Company' };
  // The old page read this latest member evaluation as if it were the manager's.
  state.report.evaluations = [{ ...signed(), signatureId: 'member-signature' }];
  t.mock.method(auth, 'requireUser', async () => manager);
  t.mock.method(companies, 'attachEffectiveSenderCompanies', async (rows) => rows);
  t.mock.method(storage, 'signAttachments', async (files) => files);
  let table = findTable(await ReviewerEvaluatePage({ params: Promise.resolve({ id: 'report' }) }));
  assert.ok(table);
  assert.ok(!table.props.locked);
  assert.equal(table.props.savedScores, null);
  assert.deepEqual(table.props.savedNotes, {});
  assert.equal(table.props.signatureId, null);
  assert.equal(table.props.selfName, manager.name);
  assert.equal(table.props.otherEvaluations.length, 2);

  state.report.assignments.push(managerAssignment({ ...signed(10), signatureId: 'manager-signature' }));
  table = findTable(await ReviewerEvaluatePage({ params: Promise.resolve({ id: 'report' }) }));
  assert.ok(table.props.locked);
  assert.deepEqual(table.props.savedScores, { c1: '5', c2: '5' });
  assert.equal(table.props.signatureId, 'manager-signature');
});

test('the manager page allows own scoring while a member is still unsigned', async (t) => {
  const state = setup(t, { assignments: [member('a'), member('b', null)], status: 'in_review' });
  state.report.senderCompany = { name: 'Company' };
  t.mock.method(auth, 'requireUser', async () => manager);
  t.mock.method(companies, 'attachEffectiveSenderCompanies', async (rows) => rows);
  t.mock.method(storage, 'signAttachments', async (files) => files);
  const table = findTable(await ReviewerEvaluatePage({ params: Promise.resolve({ id: 'report' }) }));
  assert.ok(table);
  assert.ok(!table.props.locked);
  assert.equal(table.props.savedScores, null);
  assert.equal(table.props.otherEvaluations.length, 1);
});

test('manager actions offer scoring before members finish and reserve final approval until all sign', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const Card = require('../components/reports/detail/ScoreApprovalCard.tsx').default;
  const pending = {
    reportId: 'report', reportNumber: 'BOMT-1', evaluatorCount: 2, signedEvaluatorCount: 1,
    finalScore: null, ownEvaluationSigned: false, canApprove: false,
  };
  const render = (overrides) => renderToStaticMarkup(React.createElement(Card, { approval: null, pending: { ...pending, ...overrides } }));
  const early = render();
  assert.ok(early.includes('/reviewer/evaluate/report'));
  assert.ok(early.includes('Өөрийн үнэлгээ өгөх'));
  assert.ok(!early.includes('Үнэлгээг батлах'));
  const waiting = render({ ownEvaluationSigned: true });
  assert.ok(waiting.includes('Өөрийн үнэлгээ харах'));
  assert.ok(!waiting.includes('Үнэлгээг батлах'));
  const ready = render({ ownEvaluationSigned: true, signedEvaluatorCount: 2, finalScore: 8.3, canApprove: true });
  assert.ok(ready.includes('Үнэлгээг батлах'));
});

test('the report page shows 1/3 members and no approval button even after the manager signs', async (t) => {
  const { renderToStaticMarkup } = require('react-dom/server');
  const Card = require('../components/reports/detail/ScoreApprovalCard.tsx').default;
  const ReportDetailPage = require('../app/report/[id]/page.tsx').default;
  const profileQr = require('../lib/auth/profileQr.ts');
  const state = setup(t, {
    assignments: [member('a'), member('b', null), member('c', null), managerAssignment(signed(9))],
    status: 'in_review',
  });
  state.report.senderCompany = { name: 'Company' };
  state.report.finalScore = null;
  t.mock.method(auth, 'requireUser', async () => manager);
  t.mock.method(companies, 'attachEffectiveSenderCompanies', async (rows) => rows);
  t.mock.method(storage, 'signAttachments', async (files) => files);
  t.mock.method(profileQr, 'getPublicProfileQrUrl', async () => 'https://example.test/profile');
  t.mock.method(profileQr, 'createQrImageUrl', async () => 'data:image/png;base64,');
  const findCard = (node) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(findCard).find(Boolean) ?? null;
    return node.type === Card ? node : findCard(node.props?.children);
  };
  const card = findCard(await ReportDetailPage({ params: Promise.resolve({ id: 'report' }) }));
  assert.ok(card);
  assert.equal(card.props.pending.evaluatorCount, 3);
  assert.equal(card.props.pending.signedEvaluatorCount, 1);
  assert.equal(card.props.pending.ownEvaluationSigned, true);
  assert.equal(card.props.pending.canApprove, false);
  const html = renderToStaticMarkup(card);
  assert.ok(html.includes('1 / 3 гишүүн'));
  assert.ok(html.includes('Таны үнэлгээ баталгаажсан'));
  assert.ok(!html.includes('Үнэлгээг батлах'));
});

test('the approval API checks signatures even if a stale report status says completed', async (t) => {
  const state = setup(t, { assignments: [member('a'), member('b', null), managerAssignment(signed(9))] });
  const response = await approveScores(approvalRequest(), { params: Promise.resolve({ id: 'report' }) });
  assert.equal(response.status, 400);
  assert.equal(state.reportUpdate.mock.callCount(), 0);
  assert.equal(state.pinCheck.mock.callCount(), 0);
});
