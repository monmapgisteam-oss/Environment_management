const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const data = require('../lib/arcgis/data.ts').default;
const { compileWhere } = require('../lib/arcgis/data.ts');
const { clearSchemaCache, applyEdits } = require('../lib/arcgis/service.ts');
const { schema, definition } = require('../scripts/arcgis-schema.cjs');
const { createSignedUrl, verifyAttachmentToken, uploadAttachment } = require('../lib/arcgis/storage.ts');
const { downloadUrl } = require('../lib/attachments.ts');
const { hashPassword, verifyPassword } = require('../lib/password.ts');

const originalFetch = global.fetch;
const models = Object.keys(schema);
let requests;
let handler;
const modelId = (model) => models.indexOf(model);
const feature = (model, attributes, objectId = 1) => ({ attributes: {
  OBJECTID: objectId, ...Object.fromEntries(Object.entries(attributes).map(([key, value]) => [`app_${key}`, value])),
} });

beforeEach(() => {
  process.env.ARCGIS_DATA_SERVICE_URL = 'https://example.arcgis.com/rest/services/private/FeatureServer';
  process.env.ARCGIS_DATA_TOKEN = 'server-secret';
  process.env.JWT_SECRET = 'test-only-secret-with-at-least-thirty-two-characters';
  clearSchemaCache();
  requests = [];
  handler = () => { throw new Error('Unexpected test request'); };
  global.fetch = async (url, options) => {
    const suffix = String(url).split('/FeatureServer')[1];
    const body = options.body;
    requests.push({ suffix, body });
    let result;
    if (suffix === '') result = { layers: [], tables: models.map((model, id) => ({ id, name: schema[model].name })) };
    else if (/^\/\d+$/.test(suffix)) {
      const id = Number(suffix.slice(1));
      result = { ...definition(models[id], id), objectIdField: 'OBJECTID', maxRecordCount: 2 };
    } else result = await handler(suffix, body);
    return new Response(JSON.stringify(result), { headers: { 'content-type': 'application/json' } });
  };
});
afterEach(() => { global.fetch = originalFetch; });

test('escapes quoted values, validates fields, and handles empty lists and date bounds', async () => {
  const sql = await compileWhere('user', { email: "x' OR 1=1 --", role: { in: [] } });
  assert.match(sql, /x'' OR 1=1 --/);
  assert.match(sql, /1=0/);
  assert.match(await compileWhere('report', { submittedAt: { gte: new Date('2026-01-01T00:00:00Z') } }), /TIMESTAMP '2026-01-01 00:00:00.000'/);
  await assert.rejects(() => compileWhere('report', { 'id; DROP TABLE': 'x' }), /Unknown/);
  await assert.rejects(() => compileWhere('report', { title: { unsupported: 'x' } }), /Unsupported/);
});

test('paginates every record and restores Date and boolean fields', async () => {
  const offsets = [];
  handler = (suffix, body) => {
    assert.equal(suffix, `/${modelId('notification')}/query`);
    const offset = Number(body.get('resultOffset'));
    offsets.push(offset);
    return offset === 0 ? {
      features: [feature('notification', { id: 'n1', isRead: 0, createdAt: 1000 }, 1), feature('notification', { id: 'n2', isRead: 1, createdAt: 2000 }, 2)], exceededTransferLimit: true,
    } : { features: [feature('notification', { id: 'n3', isRead: 0, createdAt: 3000 }, 3)] };
  };
  const rows = await data.notification.findMany({ orderBy: { createdAt: 'asc' } });
  assert.deepEqual(offsets, [0, 2]);
  assert.deepEqual(rows.map((row) => row.id), ['n1', 'n2', 'n3']);
  assert.equal(rows[1].isRead, true);
  assert.equal(rows[0].createdAt.toISOString(), '1970-01-01T00:00:01.000Z');
  assert.equal(requests.every(({ body }) => body.get('token') === 'server-secret'), true);
});

test('take and skip limit the remote query', async () => {
  handler = (_, body) => {
    assert.equal(body.get('resultOffset'), '4');
    assert.equal(body.get('resultRecordCount'), '1');
    return { features: [feature('user', { id: 'u5', name: 'Fifth' }, 5)] };
  };
  assert.deepEqual(await data.user.findMany({ skip: 4, take: 1, select: { id: true } }), [{ id: 'u5' }]);
});

test('joins nested relations and applies child limits per parent', async () => {
  handler = (suffix, body) => {
    const offset = Number(body.get('resultOffset'));
    if (suffix === `/${modelId('company')}/query`) return { features: [feature('company', { id: 'c1', name: 'Company' })] };
    if (suffix === `/${modelId('user')}/query`) {
      assert.match(body.get('where'), /app_companyId IN \('c1'\)/);
      return offset ? { features: [] } : { features: [feature('user', { id: 'u1', companyId: 'c1', name: 'One' }, 1), feature('user', { id: 'u2', companyId: 'c1', name: 'Two' }, 2)] };
    }
    throw new Error(suffix);
  };
  const rows = await data.company.findMany({ select: { name: true, users: { select: { name: true }, take: 1 } } });
  assert.deepEqual(rows, [{ name: 'Company', users: [{ name: 'One' }] }]);
});

test('relation filters and isNot null translate to matching foreign keys', async () => {
  handler = (suffix) => {
    assert.equal(suffix, `/${modelId('evaluation')}/query`);
    return { features: [feature('evaluation', { id: 'e1', assignmentId: 'a1', status: 'SIGNED' })] };
  };
  assert.match(await compileWhere('reportAssignment', { evaluation: { status: 'SIGNED' } }), /app_id IN \('a1'\)/);
  assert.match(await compileWhere('reportAssignment', { evaluation: { isNot: null } }), /app_id IN \('a1'\)/);
});

test('nested report/location create is sent in one atomic service edit', async () => {
  let edits;
  handler = (suffix, body) => {
    if (suffix === `/${modelId('company')}/query`) return { features: [feature('company', { id: 'c1' })] };
    if (suffix === `/${modelId('reportType')}/query`) return { features: [feature('reportType', { id: 't1' })] };
    assert.equal(suffix, '/applyEdits');
    assert.equal(body.get('rollbackOnFailure'), 'true');
    edits = JSON.parse(body.get('edits'));
    return edits.map((edit) => ({ id: edit.id, addResults: edit.adds.map(() => ({ success: true, objectId: 8 })) }));
  };
  const result = await data.report.create({ data: {
    id: 'r1', reportNumber: 'R1', senderCompanyId: 'c1', reportTypeId: 't1', title: 'Report', year: 2026,
    location: { create: { province: 'UB', district: 'D', khoroo: '1', latitude: 47, longitude: 106 } },
  } });
  assert.equal(result.id, 'r1');
  assert.equal(result.status, 'draft');
  assert.ok(result.createdAt instanceof Date);
  assert.equal(edits.length, 2);
  const location = edits.find((edit) => edit.id === modelId('reportLocation')).adds[0];
  assert.equal(location.attributes.app_reportId, 'r1');
  assert.deepEqual(location.geometry, { x: 106, y: 47, spatialReference: { wkid: 4326 } });
});

test('partial updates retain stored values and dates', async () => {
  handler = (suffix, body) => {
    if (suffix.endsWith('/query')) return { features: [feature('reportType', { id: 't1', name: 'Old', slug: 'slug', isActive: 1, createdAt: 1000, updatedAt: 1000 })] };
    const edits = JSON.parse(body.get('edits'));
    assert.equal(edits[0].updates[0].attributes.app_name, 'New');
    assert.equal(edits[0].updates[0].attributes.app_slug, undefined);
    return [{ id: modelId('reportType'), updateResults: [{ success: true }] }];
  };
  const row = await data.reportType.update({ where: { id: 't1' }, data: { name: 'New' } });
  assert.equal(row.name, 'New');
  assert.equal(row.slug, 'slug');
  assert.equal(row.isActive, true);
  assert.equal(row.createdAt.getTime(), 1000);
});

test('missing required fields and foreign records fail before a write', async () => {
  handler = () => ({ features: [] });
  await assert.rejects(() => data.company.create({ data: { name: 'Missing register' } }), /required/);
  await assert.rejects(() => data.user.create({ data: { name: 'User', email: 'e', password: 'hash', role: 'sender', companyId: 'missing' } }), /does not exist/);
  assert.equal(requests.some(({ suffix }) => suffix === '/applyEdits'), false);
});

test('a missing unique identifier never reads or updates the first record', async () => {
  await assert.rejects(async () => data.user.findUnique({ where: { email: undefined } }), /unique key/);
  await assert.rejects(() => data.report.update({ where: {}, data: { title: 'wrong report' } }), /unique key/);
  assert.equal(requests.length, 0);
});

test('per-record ArcGIS failures and missing result rows never report success', async () => {
  handler = () => [{ id: 1, addResults: [{ success: false }] }];
  await assert.rejects(() => applyEdits([{ id: 1, adds: [{ attributes: {} }] }]), /failed/);
  handler = () => [];
  await assert.rejects(() => applyEdits([{ id: 1, adds: [{ attributes: {} }] }]), /confirm/);
});

test('ArcGIS error objects are surfaced rather than treated as empty data', async () => {
  handler = () => ({ error: { code: 498, message: 'Invalid Token' } });
  await assert.rejects(() => data.report.findMany(), /498/);
});

test('attachment links hide credentials, expire, and reject session tokens', async () => {
  const url = await createSignedUrl('arcgis-attachment:12:34');
  assert.equal(url.includes('server-secret'), false);
  const token = new URL(url, 'https://app.example').searchParams.get('token');
  assert.equal(verifyAttachmentToken(token), 'arcgis-attachment:12:34');
  const expired = new URL(await createSignedUrl('arcgis-attachment:12:34', -1), 'https://app.example').searchParams.get('token');
  assert.equal(verifyAttachmentToken(expired), null);
  const session = jwt.sign({ reference: 'arcgis-attachment:12:34' }, process.env.JWT_SECRET, { audience: 'tailan-session' });
  assert.equal(verifyAttachmentToken(session), null);
  assert.equal(verifyAttachmentToken(`${token}tampered`), null);
  assert.ok(downloadUrl({ url, name: 'report.pdf' }).startsWith('/api/attachments?'));
});

test('uploads attach the file to a service row and return a durable reference', async () => {
  handler = (suffix, body) => {
    if (suffix === '/applyEdits') return [{ id: modelId('upload'), addResults: [{ success: true, objectId: 42 }] }];
    assert.equal(suffix, `/${modelId('upload')}/42/addAttachment`);
    assert.equal(body.get('attachment').name, 'photo.png');
    return { addAttachmentResult: { success: true, objectId: 7 } };
  };
  assert.deepEqual(await uploadAttachment(new File(['image'], 'photo.png', { type: 'image/png' }), 'u1'), { url: 'arcgis-attachment:42:7', name: 'photo.png' });
});

test('password hashes validate only the correct password', () => {
  const hash = hashPassword('a-long-test-password');
  assert.notEqual(hash, 'a-long-test-password');
  assert.equal(verifyPassword('a-long-test-password', hash), true);
  assert.equal(verifyPassword('wrong', hash), false);
  assert.equal(verifyPassword('plaintext', 'plaintext'), false);
});

test('schema includes every application model, unique keys, and private upload storage', () => {
  assert.equal(models.length, 12);
  const users = definition('user', 1);
  assert.ok(users.indexes.some((index) => index.fields === 'app_email' && index.isUnique));
  assert.equal(definition('reportLocation', 2).geometryType, 'esriGeometryPoint');
  assert.equal(definition('upload', 11).hasAttachments, true);
});
