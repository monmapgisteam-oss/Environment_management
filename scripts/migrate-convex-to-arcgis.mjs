// One-time copy of the application data and uploaded files from Convex into
// the private ArcGIS feature service (lib/db/index.ts). Run
// `npm run arcgis:provision` first so every dataset and field exists.
//
//   npm run migrate:convex -- --dry-run   # read both sides, change nothing
//   npm run migrate:convex -- --replace   # back up, clear and refill ArcGIS
//
// Without --replace it refuses to run while any tailan_ dataset has records.
// With --replace the current ArcGIS records are first saved to
// backups/arcgis-<time>.json, then deleted. File references are rewritten from
// "convex-upload:<id>" to "upload:<id>"; IDs and timestamps are kept.
import fs from 'node:fs';
import path from 'node:path';

const schemas = JSON.parse(fs.readFileSync(new URL('../lib/db/schema.json', import.meta.url), 'utf8'));
const dryRun = process.argv.includes('--dry-run');
const replace = process.argv.includes('--replace');

const env = process.env;
for (const name of ['CONVEX_URL', 'CONVEX_SERVER_SECRET', 'ARCGIS_PORTAL_URL', 'ARCGIS_DATA_SERVICE_URL', 'ARCGIS_CLIENT_ID', 'ARCGIS_CLIENT_SECRET']) {
  if (!env[name]?.trim()) throw new Error(`${name} is required.`);
}

// --- Convex (HTTP API, so the Convex package is not needed) -----------------
async function convexQuery(name, args) {
  const response = await fetch(`${env.CONVEX_URL.replace(/\/$/, '')}/api/query`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: name, args: { secret: env.CONVEX_SERVER_SECRET, ...args }, format: 'json' }),
  });
  const result = await response.json();
  if (result.status !== 'success') throw new Error(`Convex ${name} failed: ${result.errorMessage || response.status}`);
  return result.value;
}

// --- ArcGIS ------------------------------------------------------------------
const headers = env.ARCGIS_HTTP_REFERER ? { Referer: env.ARCGIS_HTTP_REFERER } : {};
const service = env.ARCGIS_DATA_SERVICE_URL.replace(/\/$/, '');
const tokenResponse = await (await fetch(`${env.ARCGIS_PORTAL_URL.replace(/\/$/, '')}/sharing/rest/oauth2/token`, {
  method: 'POST', headers,
  body: new URLSearchParams({ f: 'json', grant_type: 'client_credentials', client_id: env.ARCGIS_CLIENT_ID, client_secret: env.ARCGIS_CLIENT_SECRET }),
})).json();
if (!tokenResponse.access_token) throw new Error('ArcGIS rejected the OAuth application credentials.');
const token = tokenResponse.access_token;

async function arcgis(pathName, values = {}) {
  const body = new URLSearchParams({ f: 'json', token });
  for (const [key, value] of Object.entries(values)) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  const response = await fetch(`${service}${pathName ? `/${pathName}` : ''}`, { method: 'POST', headers, body });
  if (!response.ok) throw new Error(`ArcGIS request failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.error) throw new Error(`ArcGIS request failed (code ${result.error.code}): ${result.error.message}`);
  return result;
}

async function queryAll(layer) {
  const features = [];
  for (let offset = 0; ;) {
    const page = await arcgis(`${layer.id}/query`, {
      where: '1=1', outFields: '*', returnGeometry: true, orderByFields: `${layer.objectIdField} ASC`,
      resultOffset: offset, resultRecordCount: 1000,
    });
    features.push(...page.features);
    if (!page.exceededTransferLimit && page.features.length < 1000) break;
    offset += page.features.length;
  }
  return features;
}

async function applyEdits(layerId, edit) {
  const [result] = await arcgis('applyEdits', { edits: [{ id: layerId, ...edit }], rollbackOnFailure: true });
  for (const key of ['addResults', 'updateResults', 'deleteResults']) {
    const failed = (result?.[key] || []).find((entry) => !entry.success);
    if (failed) throw new Error(`ArcGIS ${key} failed: ${JSON.stringify(failed.error)}`);
  }
  return result;
}

const root = await arcgis('');
const entries = [...(root.layers || []), ...(root.tables || [])];
const layers = {};
const gaps = [];
for (const [model, schema] of Object.entries(schemas)) {
  const entry = entries.find((value) => value.name === schema.name);
  if (!entry) { gaps.push(`${schema.name} is missing`); continue; }
  layers[model] = await arcgis(String(entry.id));
  const present = new Set(layers[model].fields.map((field) => field.name.toLowerCase()));
  const missing = Object.keys(schema.fields).filter((key) => !present.has(`app_${key}`.toLowerCase()));
  if (missing.length) gaps.push(`${schema.name} lacks ${missing.join(', ')}`);
}
const storedName = (model, key) => layers[model].fields.find((field) => field.name.toLowerCase() === `app_${key}`.toLowerCase()).name;

// --- Plan --------------------------------------------------------------------
const source = {};
for (const model of Object.keys(schemas)) source[model] = await convexQuery('data:read', { model, op: 'findMany', args: {} });
const current = {};
for (const model of Object.keys(schemas)) current[model] = layers[model] ? await queryAll(layers[model]) : [];

for (const model of Object.keys(schemas)) {
  console.log(`${schemas[model].name}: Convex ${source[model].length}, ArcGIS now ${current[model].length}`);
}
if (gaps.length) {
  console.log(`${gaps.join('\n')}\nRun npm run arcgis:provision first.`);
  process.exit(dryRun ? 0 : 1);
}
const occupied = Object.values(current).some((features) => features.length);
if (occupied && !replace) {
  console.log('ArcGIS already has records. Run again with --replace to back them up and replace them.');
  process.exit(dryRun ? 0 : 1);
}
if (dryRun) {
  console.log('Dry run: nothing was changed.');
  process.exit(0);
}

// --- Back up and clear -------------------------------------------------------
if (occupied) {
  fs.mkdirSync('backups', { recursive: true });
  const file = path.join('backups', `arcgis-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(file, JSON.stringify(current, null, 2), { mode: 0o600 });
  console.log(`Saved the current ArcGIS records to ${file}.`);
  for (const model of Object.keys(schemas)) {
    const layer = layers[model];
    const ids = current[model].map((feature) => feature.attributes[layer.objectIdField]);
    for (let i = 0; i < ids.length; i += 500) await applyEdits(layer.id, { deletes: ids.slice(i, i + 500) });
  }
  console.log('Cleared the ArcGIS datasets.');
}

// --- Copy records --------------------------------------------------------------
const rewrite = (value) => typeof value === 'string' ? value.replace(/convex-upload:/g, 'upload:') : value;

for (const model of Object.keys(schemas)) {
  const layer = layers[model];
  const features = source[model].map((row) => {
    const attributes = {};
    for (const [key, field] of Object.entries(schemas[model].fields)) {
      if (key === 'storageId') continue;
      let value = row[key] ?? null;
      if (value != null && field.type === 'boolean') value = value ? 1 : 0;
      attributes[storedName(model, key)] = rewrite(value);
    }
    const feature = { attributes };
    if (layer.geometryType) {
      feature.geometry = row.latitude == null || row.longitude == null ? null : { x: row.longitude, y: row.latitude, spatialReference: { wkid: 4326 } };
    }
    return feature;
  });
  for (let i = 0; i < features.length; i += 200) await applyEdits(layer.id, { adds: features.slice(i, i + 200) });
  console.log(`Copied ${features.length} ${model} records.`);
}

// --- Copy files ------------------------------------------------------------------
const uploadLayer = layers.upload;
if (!uploadLayer.hasAttachments) throw new Error('Attachments are not enabled on tailan_upload.');
const uploadIds = new Map((await queryAll(uploadLayer)).map((feature) => [feature.attributes[storedName('upload', 'id')], feature.attributes[uploadLayer.objectIdField]]));
let copied = 0;
for (const upload of source.upload) {
  if (!upload.storageId) continue;
  const url = await convexQuery('files:url', { storageId: upload.storageId });
  if (!url) { console.warn(`File of upload ${upload.id} is missing in Convex; skipped.`); continue; }
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download of upload ${upload.id} failed (HTTP ${response.status}).`);
  const objectId = uploadIds.get(upload.id);
  const form = new FormData();
  form.set('f', 'json');
  form.set('token', token);
  form.set('attachment', new Blob([await response.arrayBuffer()], { type: response.headers.get('content-type') || 'application/octet-stream' }), upload.name);
  const added = await (await fetch(`${service}/${uploadLayer.id}/${objectId}/addAttachment`, { method: 'POST', headers, body: form })).json();
  if (!added.addAttachmentResult?.success) throw new Error(`Upload of ${upload.id} failed: ${JSON.stringify(added.error || added)}`);
  await applyEdits(uploadLayer.id, { updates: [{ attributes: {
    [uploadLayer.objectIdField]: objectId, [storedName('upload', 'storageId')]: String(added.addAttachmentResult.objectId),
  } }] });
  copied += 1;
}
console.log(`Copied ${copied} files.`);

// --- Verify ------------------------------------------------------------------------
let mismatch = false;
for (const model of Object.keys(schemas)) {
  const count = (await arcgis(`${layers[model].id}/query`, { where: '1=1', returnCountOnly: true })).count;
  if (count !== source[model].length) { mismatch = true; console.error(`${model}: expected ${source[model].length}, found ${count}`); }
}
if (mismatch) process.exit(1);
console.log('All records and files are in ArcGIS.');
