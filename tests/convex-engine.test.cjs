const test = require('node:test');
const assert = require('node:assert/strict');
const { read, write } = require('../convex/engine.ts');

// In-memory Store with the same contract as the Convex-backed one.
function memoryStore() {
  const tables = {};
  let next = 0;
  return {
    tables,
    async load(model, equals) {
      const rows = tables[model] || [];
      return rows.filter((entry) => !equals || entry.row[equals.field] === equals.value).map((entry) => ({ ...entry, row: { ...entry.row } }));
    },
    async insert(model, row) { (tables[model] ||= []).push({ row: { ...row }, docId: String(++next), order: next }); },
    async patch(model, docId, row) { Object.assign(tables[model].find((entry) => entry.docId === docId).row, row); },
    async remove(model, docId) { tables[model] = tables[model].filter((entry) => entry.docId !== docId); },
  };
}

let counter = 0;
const uuid = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;

async function seed() {
  const store = memoryStore();
  const company = await write(store, 'company', 'create', { data: { name: 'Acme', registerNumber: 'R1', type: 'sender' } }, uuid);
  await write(store, 'user', 'create', { data: { name: 'A', email: 'a@x.mn', password: 'p', role: 'sender', companyId: company.id } }, uuid);
  await write(store, 'user', 'create', { data: { name: 'B', email: 'b@x.mn', password: 'p', role: 'admin', phone: '99' } }, uuid);
  return { store, company };
}

test('create fills defaults and validates relations', async () => {
  const { store, company } = await seed();
  const user = await read(store, 'user', 'findUnique', { where: { email: 'a@x.mn' }, include: { company: true } });
  assert.equal(user.company.id, company.id);
  assert.equal(typeof user.createdAt, 'number');
  await assert.rejects(write(store, 'user', 'create', { data: { name: 'C', email: 'c@x.mn', password: 'p', role: 'sender', companyId: 'missing' } }, uuid), /does not exist/);
  await assert.rejects(write(store, 'user', 'create', { data: { name: 'D', email: 'a@x.mn', password: 'p', role: 'sender' } }, uuid), /must be unique/);
});

test('filters follow SQL NULL semantics', async () => {
  const { store } = await seed();
  const names = async (where) => (await read(store, 'user', 'findMany', { where, orderBy: { name: 'asc' } })).map((u) => u.name);
  assert.deepEqual(await names({ phone: null }), ['A']);
  assert.deepEqual(await names({ phone: { not: null } }), ['B']);
  assert.deepEqual(await names({ phone: { not: '99' } }), []);
  assert.deepEqual(await names({ OR: [{ role: 'admin' }, { email: { in: ['a@x.mn'] } }] }), ['A', 'B']);
  assert.deepEqual(await names({ NOT: { role: 'admin' } }), ['A']);
  assert.deepEqual(await names({ company: { name: 'Acme' } }), ['A']);
  assert.deepEqual(await names({ company: { is: null } }), ['B']);
  assert.equal(await read(store, 'user', 'count', { where: { role: { in: [] } } }), 0);
});

test('ordering, pagination, _count and nested writes', async () => {
  const { store, company } = await seed();
  const desc = await read(store, 'user', 'findMany', { orderBy: { phone: 'desc' }, take: 1 });
  assert.equal(desc[0].name, 'A'); // NULLs first when descending
  const counted = await read(store, 'company', 'findFirst', { where: { id: company.id }, include: { _count: { select: { users: true } } } });
  assert.equal(counted._count.users, 1);
  const type = await write(store, 'reportType', 'create', { data: { name: 'T', slug: 't' } }, uuid);
  const report = await write(store, 'report', 'create', {
    data: { reportNumber: 'N1', reportTypeId: type.id, senderCompanyId: company.id, title: 'R', year: 2026, location: { create: { province: 'P', district: 'D', khoroo: 'K' } } },
    include: { location: true },
  }, uuid);
  assert.equal(report.status, 'draft');
  assert.equal(report.location.reportId, report.id);
  const updated = await write(store, 'report', 'update', { where: { id: report.id }, data: { status: 'submitted' } }, uuid);
  assert.equal(updated.status, 'submitted');
  await assert.rejects(write(store, 'report', 'update', { where: { title: 'R' }, data: {} }, uuid), /unique key/);
});

test('report category accepts only the listed sectors', async () => {
  const { store, company } = await seed();
  const type = await write(store, 'reportType', 'create', { data: { name: 'T', slug: 't' } }, uuid);
  const base = { reportTypeId: type.id, senderCompanyId: company.id, title: 'R', year: 2026 };
  const report = await write(store, 'report', 'create', { data: { ...base, reportNumber: 'N1', reportCategory: 'Үйлдвэрлэл' } }, uuid);
  assert.equal(report.reportCategory, 'Үйлдвэрлэл');
  const withoutCategory = await write(store, 'report', 'create', { data: { ...base, reportNumber: 'N2' } }, uuid);
  assert.equal(withoutCategory.reportCategory, null);
  await assert.rejects(write(store, 'report', 'create', { data: { ...base, reportNumber: 'N3', reportCategory: 'Other' } }, uuid));
});

test('criteria category accepts only the report categories', async () => {
  const { store } = await seed();
  const criterion = await write(store, 'evaluationCriterion', 'create', { data: { name: 'C', category: 'Үйлдвэрлэл', maxScore: 20, sortOrder: 1 } }, uuid);
  assert.equal(criterion.category, 'Үйлдвэрлэл');
  const found = await read(store, 'evaluationCriterion', 'findMany', { where: { category: 'Үйлдвэрлэл' } });
  assert.equal(found.length, 1);
  await assert.rejects(write(store, 'evaluationCriterion', 'create', { data: { name: 'D', category: 'Other', maxScore: 5, sortOrder: 2 } }, uuid));
});

test('a report number range holds only that year\'s RPT numbers', async () => {
  const { store, company } = await seed();
  const type = await write(store, 'reportType', 'create', { data: { name: 'T', slug: 't' } }, uuid);
  for (const reportNumber of ['RPT-2026-0001', 'RPT-2026-0012', 'RPT-2025-0099', 'RPT-20260-1', 'S123-6']) {
    await write(store, 'report', 'create', { data: { reportNumber, reportTypeId: type.id, senderCompanyId: company.id, title: 'R', year: 2026 } }, uuid);
  }
  const rows = await read(store, 'report', 'findMany', { where: { reportNumber: { gte: 'RPT-2026-', lt: 'RPT-2026.' } }, orderBy: { reportNumber: 'asc' } });
  assert.deepEqual(rows.map((r) => r.reportNumber), ['RPT-2026-0001', 'RPT-2026-0012']);
});
