const test = require('node:test');
const assert = require('node:assert/strict');
const { findActiveHref, reviewerNav, senderNav, staffNav } = require('../lib/nav.ts');

const reportTypes = [
  { name: 'Жилийн төлөвлөгөө', slug: 'type-1' },
  { name: 'Биелэлтийн тайлан', slug: 'type-2' },
  { name: 'Нэмэлт мэдээ', slug: 'type-5' },
];

function active(items, path) {
  const url = new URL(path, 'http://app.local');
  return findActiveHref(items, url.pathname, url.searchParams);
}

test('report type submenu leaves out the additional type and keeps the core types', () => {
  const received = reviewerNav([{ name: 'Нэмэлт мэдээ', slug: 'type-5' }])[1];
  assert.deepEqual(
    received.children.map((child) => child.href),
    ['/reviewer/reports?type=type-1', '/reviewer/reports?type=type-2'],
  );
});

test('the item with the most matching query values wins', () => {
  const nav = reviewerNav(reportTypes);
  assert.equal(active(nav, '/reviewer/reports'), '/reviewer/reports');
  assert.equal(active(nav, '/reviewer/reports?type=type-1'), '/reviewer/reports?type=type-1');
  assert.equal(active(nav, '/reviewer/reports?type=type-5'), '/reviewer/reports?type=type-5');
  assert.equal(active(nav, '/reviewer/assign'), null);
});

test('match prefixes mark detail pages active', () => {
  assert.equal(active(staffNav(reportTypes), '/evaluator/evaluate/abc'), '/evaluator');
  assert.equal(active(reviewerNav(reportTypes), '/report/abc?role=reviewer'), '/reviewer/reports');
  assert.equal(active(senderNav(), '/report/abc'), '/sender/reports');
});

test('sender submit links match on the type query', () => {
  const nav = senderNav();
  assert.equal(active(nav, '/sender/submit?type=performance'), '/sender/submit?type=performance');
  assert.equal(active(nav, '/sender/submit?type=additional'), '/sender/submit?type=additional');
  assert.equal(active(nav, '/sender/submit?edit=abc'), null);
});
