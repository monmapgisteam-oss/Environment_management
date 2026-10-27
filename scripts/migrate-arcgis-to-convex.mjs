// One-time copy of the ArcGIS application tables and their uploaded files into
// Convex. Run it from a machine that can reach the ArcGIS portal:
//
//   node scripts/migrate-arcgis-to-convex.mjs --dry-run
//   node scripts/migrate-arcgis-to-convex.mjs
//
// Reads ARCGIS_PORTAL_URL, ARCGIS_DATA_SERVICE_URL, ARCGIS_CLIENT_ID,
// ARCGIS_CLIENT_SECRET, ARCGIS_HTTP_REFERER, CONVEX_URL and CONVEX_SERVER_SECRET
// from .env.local. Refuses to run unless the Convex tables are empty.
import fs from 'node:fs';
import { ConvexHttpClient } from 'convex/browser';
import { anyApi } from 'convex/server';

const schemas = JSON.parse(fs.readFileSync(new URL('../lib/db/schema.json', import.meta.url), 'utf8'));
const dryRun = process.argv.includes('--dry-run');

const env = { ...process.env };
for (const file of ['.env', '.env.local']) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (match) env[match[1]] = match[2].replace(/^"(.*)"$/, '$1');
  }
}
for (const name of ['ARCGIS_DATA_SERVICE_URL', 'ARCGIS_CLIENT_ID', 'ARCGIS_CLIENT_SECRET', 'CONVEX_URL', 'CONVEX_SERVER_SECRET']) {
  if (!env[name]) throw new Error(`${name} is required.`);
}

// --- ArcGIS -----------------------------------------------------------------
const headers = env.ARCGIS_HTTP_REFERER ? { Referer: env.ARCGIS_HTTP_REFERER } : {};
const portal = (env.ARCGIS_PORTAL_URL || 'https://www.arcgis.com').replace(/\/$/, '');
const service = env.ARCGIS_DATA_SERVICE_URL.replace(/\/$/, '');

const tokenResponse = await (await fetch(`${portal}/sharing/rest/oauth2/token`, {
  method: 'POST', headers,
  body: new URLSearchParams({ f: 'json', grant_type: 'client_credentials', client_id: env.ARCGIS_CLIENT_ID, client_secret: env.ARCGIS_CLIENT_SECRET }),
})).json();
if (!tokenResponse.access_token) throw new Error('ArcGIS rejected the OAuth application credentials.');
const token = tokenResponse.access_token;

async function arcgis(path, values = {}) {
  const body = new URLSearchParams({ f: 'json', token });
  for (const [key, value] of Object.entries(values)) if (value !== undefined) body.set(key, String(value));
  const response = await fetch(`${service}${path ? `/${path}` : ''}`, { method: 'POST', headers, body });
  if (!response.ok) throw new Error(`ArcGIS request failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.error) throw new Error(`ArcGIS request failed (code ${result.error.code}): ${result.error.message}`);
  return result;
}

async function queryAll(layerId, extra = {}) {
  const info = await arcgis(String(layerId));
  const features = [];
  for (let offset = 0; ; ) {
    const page = await arcgis(`${layerId}/query`, {
      where: '1=1', outFields: '*', orderByFields: `${info.objectIdField} ASC`,
      resultOffset: offset, resultRecordCount: 1000, ...extra,
    });
    features.push(...page.features);
    if (!page.exceededTransferLimit && page.features.length < 1000) break;
    offset += page.features.length;
  }
  return { info, features };
}

async function download(layerId, objectId, attachmentId) {
  const url = new URL(`${service}/${layerId}/${objectId}/attachments/${attachmentId}`);
  url.searchParams.set('token', token);
  const response = await fetch(url, { headers });
  if (!response.ok || response.headers.get('content-type')?.includes('json')) throw new Error(`Attachment ${layerId}/${objectId}/${attachmentId} download failed.`);
  return { bytes: await response.arrayBuffer(), contentType: response.headers.get('content-type') || 'application/octet-stream' };
}

async function attachmentGroups(layerId, objectIds) {
  const groups = [];
  for (let i = 0; i < objectIds.length; i += 100) {
    const result = await arcgis(`${layerId}/queryAttachments`, { objectIds: objectIds.slice(i, i + 100).join(',') });
    groups.push(...(result.attachmentGroups || []));
  }
  return groups;
}

// --- Convex -----------------------------------------------------------------
const convex = new ConvexHttpClient(env.CONVEX_URL);
const secret = env.CONVEX_SERVER_SECRET;

const counts = await convex.mutation(anyApi.migrate.tableCounts, { secret });
const filled = Object.entries(counts).filter(([, count]) => count > 0);
if (filled.length) throw new Error(`Convex already has data (${filled.map(([t, c]) => `${t}=${c}`).join(', ')}). Clear it first.`);

async function store(bytes, contentType) {
  if (dryRun) return 'dry-run';
  const uploadUrl = await convex.mutation(anyApi.files.generateUploadUrl, { secret });
  const response = await fetch(uploadUrl, { method: 'POST', headers: { 'Content-Type': contentType }, body: bytes });
  if (!response.ok) throw new Error(`Convex upload failed (HTTP ${response.status}).`);
  return (await response.json()).storageId;
}

async function insert(table, rows) {
  if (dryRun || !rows.length) return;
  for (let i = 0; i < rows.length; i += 200) {
    await convex.mutation(anyApi.migrate.insertRows, { secret, table, rows: rows.slice(i, i + 200) });
  }
}

const root = await arcgis('');
const entries = [...(root.layers || []), ...(root.tables || [])];
const entry = (name) => entries.find((item) => item.name === name);

// --- Application tables -----------------------------------------------------
function decode(model, attributes) {
  const normalized = new Map(Object.entries(attributes).map(([key, value]) => [key.toLowerCase(), value]));
  const row = {};
  for (const [key, field] of Object.entries(schemas[model].fields)) {
    let value = normalized.get(`app_${key}`.toLowerCase()) ?? null;
    if (value != null && field.type === 'boolean') value = Boolean(value);
    if (value != null && field.type === 'date') value = typeof value === 'number' ? value : Date.parse(value);
    if (value == null && !field.nullable) {
      if (field.default === 'now' || field.updatedAt) value = normalized.get('created_date') ?? Date.now();
      else if (field.default !== undefined && field.default !== 'uuid') value = field.default;
      else throw new Error(`${model}.${key} is empty on ArcGIS object ${attributes.objectid ?? attributes.OBJECTID}.`);
    }
    row[key] = value;
  }
  return row;
}

const appRows = {};
const uploadIdByObjectId = new Map();
for (const model of Object.keys(schemas)) {
  const layer = entry(`tailan_${model}`);
  if (!layer) { console.log(`${model}: no ArcGIS table, skipped`); appRows[model] = []; continue; }
  const { info, features } = await queryAll(layer.id, { returnGeometry: false });
  appRows[model] = features.map((feature) => decode(model, feature.attributes));
  if (model === 'upload' && features.length) {
    const ids = features.map((feature) => feature.attributes[info.objectIdField]);
    const groups = await attachmentGroups(layer.id, ids);
    for (const [i, feature] of features.entries()) {
      const objectId = feature.attributes[info.objectIdField];
      const attachment = groups.find((group) => group.parentObjectId === objectId)?.attachmentInfos?.[0];
      if (!attachment) { console.warn(`upload ${objectId}: no file attached, kept without storage`); continue; }
      const file = await download(layer.id, objectId, attachment.id);
      appRows.upload[i].storageId = await store(file.bytes, attachment.contentType || file.contentType);
      uploadIdByObjectId.set(objectId, appRows.upload[i].id);
    }
  }
  console.log(`${model}: ${appRows[model].length} rows`);
}

// File references move from arcgis-attachment:<objectId>:<attachmentId> to
// convex-upload:<upload id>.
let rewritten = 0;
for (const [model, rows] of Object.entries(appRows)) {
  for (const row of rows) {
    for (const [key, field] of Object.entries(schemas[model].fields)) {
      if (field.type !== 'string' || typeof row[key] !== 'string') continue;
      const next = row[key].replace(/arcgis-attachment:(\d+):\d+/g, (match, objectId) => {
        const id = uploadIdByObjectId.get(Number(objectId));
        if (!id) throw new Error(`${model}.${key} references ${match}, which has no migrated upload.`);
        rewritten++;
        return `convex-upload:${id}`;
      });
      row[key] = next;
    }
  }
}
console.log(`file references rewritten: ${rewritten}`);

if (dryRun) {
  console.log('Dry run: nothing written to Convex.');
  process.exit(0);
}

for (const model of Object.keys(schemas)) await insert(model, appRows[model]);

const after = await convex.mutation(anyApi.migrate.tableCounts, { secret });
const expected = Object.fromEntries(Object.entries(appRows).map(([m, rows]) => [m, rows.length]));
const mismatched = Object.entries(expected).filter(([table, count]) => after[table] !== count);
if (mismatched.length) throw new Error(`Count mismatch after import: ${JSON.stringify(mismatched)}`);
console.log('Migration complete. Convex counts:', after);
