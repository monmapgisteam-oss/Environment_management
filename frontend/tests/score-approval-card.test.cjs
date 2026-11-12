const test = require('node:test');
const assert = require('node:assert/strict');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const Card = require('../components/reports/detail/ScoreApprovalCard.tsx').default;

const pending = {
  reportId: 'report', reportNumber: 'BOMT-1', evaluatorCount: 2, signedEvaluatorCount: 1,
  finalScore: null, ownEvaluationSigned: false, canApprove: false,
};
const render = (overrides) => renderToStaticMarkup(React.createElement(Card, { approval: null, pending: { ...pending, ...overrides } }));

test('manager actions offer scoring before members finish and reserve final approval until all sign', () => {
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

test('the card shows 1/3 members and no approval button after the manager signs', () => {
  const html = render({ evaluatorCount: 3, signedEvaluatorCount: 1, ownEvaluationSigned: true });
  assert.ok(html.includes('1 / 3 гишүүн'));
  assert.ok(html.includes('Таны үнэлгээ баталгаажсан'));
  assert.ok(!html.includes('Үнэлгээг батлах'));
});
