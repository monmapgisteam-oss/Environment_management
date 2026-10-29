// Brings the private ArcGIS feature service in line with lib/db/schema.json:
// adds missing datasets, missing fields and missing key indexes. It never
// removes or changes anything that already exists, and changes no records.
//
//   npm run arcgis:provision -- --dry-run   # show what would be added
//   npm run arcgis:provision
//
// Schema changes need a token of the service owner (ARCGIS_ADMIN_TOKEN); the
// app's OAuth credential is not allowed to change the service definition.
import fs from 'node:fs';

const schemas = JSON.parse(fs.readFileSync(new URL('../lib/db/schema.json', import.meta.url), 'utf8'));
const dryRun = process.argv.includes('--dry-run');

// Shared login and sign-up attempt counters (lib/db/rateLimit.ts). Not an
// application model, so it is not in schema.json.
const datasets = {
  ...schemas,
  rateLimit: {
    name: 'tailan_rateLimit',
    fields: {
      key: { type: 'string', nullable: false, unique: true, length: 1024 },
      count: { type: 'integer', nullable: false },
      resetAt: { type: 'date', nullable: false },
    },
    relations: {},
  },
};

for (const name of ['ARCGIS_DATA_SERVICE_URL', 'ARCGIS_ADMIN_TOKEN']) {
  if (!process.env[name]?.trim()) throw new Error(`${name} is required.`);
}
const service = process.env.ARCGIS_DATA_SERVICE_URL.trim().replace(/\/$/, '');
const token = process.env.ARCGIS_ADMIN_TOKEN.trim();
const headers = process.env.ARCGIS_HTTP_REFERER ? { Referer: process.env.ARCGIS_HTTP_REFERER } : {};

// The hosted-service admin route. The federated Server Admin API
// (/admin/services/...) rejects portal tokens with HTTP 403.
const adminUrl = (() => {
  const match = service.match(/^(https:\/\/[^?#]+)\/rest\/services\/(.+)\/FeatureServer$/i);
  if (!match) throw new Error('ARCGIS_DATA_SERVICE_URL must be a hosted FeatureServer URL.');
  return `${match[1]}/rest/admin/services/${match[2]}/FeatureServer`;
})();

async function request(url, values = {}) {
  const body = new URLSearchParams({ f: 'json', token });
  for (const [key, value] of Object.entries(values)) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  const response = await fetch(url, { method: 'POST', body, headers, signal: AbortSignal.timeout(120_000) });
  if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}.`);
  const json = await response.json();
  if (json.error) throw new Error(`ArcGIS ${json.error.code}: ${json.error.message} ${(json.error.details || []).join('; ')}`);
  // Admin endpoints can answer HTTP 200 with a status error.
  if (json.status === 'error' || json.success === false) {
    throw new Error(`ArcGIS operation failed: ${(json.messages || [json.message]).join('; ')}`);
  }
  return json;
}

const fieldTypes = {
  string: 'esriFieldTypeString', integer: 'esriFieldTypeInteger', number: 'esriFieldTypeDouble',
  boolean: 'esriFieldTypeSmallInteger', date: 'esriFieldTypeDate',
};

function fieldDefinition(name, field) {
  return {
    name: `app_${name}`, alias: name, type: fieldTypes[field.type], nullable: true, editable: true,
    ...(field.type === 'string' ? { length: field.length || 4096 } : {}),
  };
}

// Unique keys and relation keys are looked up by value, so they get indexes.
function indexes(model) {
  return Object.entries(datasets[model].fields).filter(([name, field]) => field.unique || name.endsWith('Id') || name === 'key').map(([name, field]) => ({
    name: `ix_${model}_${name}`, fields: `app_${name}`, isAscending: true, isUnique: !!field.unique,
    description: field.unique ? 'Application unique key' : 'Application relationship key',
  }));
}

// New datasets are created without indexes: the data store lowercases field
// names, and indexes sent together with a new dataset fail. They are added in
// a separate pass once the fields exist.
function datasetDefinition(model, id) {
  return {
    id, name: datasets[model].name, type: 'Table',
    objectIdField: 'OBJECTID',
    fields: [
      { name: 'OBJECTID', type: 'esriFieldTypeOID', alias: 'OBJECTID', nullable: false, editable: false },
      ...Object.entries(datasets[model].fields).map(([name, field]) => fieldDefinition(name, field)),
    ],
    indexes: [], hasAttachments: false, capabilities: 'Query,Create,Update,Delete,Editing',
  };
}

// Indexes of `model` the layer lacks, naming fields as the layer stores them.
function missingIndexes(model, layer) {
  const stored = new Map(layer.fields.map((field) => [field.name.toLowerCase(), field.name]));
  const present = new Set((layer.indexes || []).map((index) => index.fields.toLowerCase()));
  return indexes(model).filter((index) => !present.has(index.fields.toLowerCase()))
    .map((index) => ({ ...index, fields: stored.get(index.fields.toLowerCase()) ?? index.fields }));
}

const root = await request(service);
const existing = [...(root.layers || []), ...(root.tables || [])];
const byName = new Map(existing.map((entry) => [entry.name, entry.id]));
const changes = [];

let nextId = Math.max(-1, ...existing.map((entry) => entry.id)) + 1;
const newDatasets = Object.keys(datasets).filter((model) => !byName.has(datasets[model].name)).map((model) => datasetDefinition(model, nextId++));
for (const dataset of newDatasets) changes.push(`add dataset ${dataset.name} (${dataset.fields.length - 1} fields, ${indexes(Object.keys(datasets).find((model) => datasets[model].name === dataset.name)).length} indexes)`);

const fieldAdditions = [];
for (const model of Object.keys(datasets)) {
  const id = byName.get(datasets[model].name);
  if (id == null) continue;
  const layer = await request(`${service}/${id}`);
  const present = new Set(layer.fields.map((field) => field.name.toLowerCase()));
  const fields = Object.entries(datasets[model].fields).filter(([name]) => !present.has(`app_${name}`.toLowerCase())).map(([name, field]) => fieldDefinition(name, field));
  const missing = indexes(model).filter((index) => !(layer.indexes || []).some((value) => value.fields.toLowerCase() === index.fields.toLowerCase()));
  if (fields.length) changes.push(`add to ${layer.name}: ${fields.map((field) => field.name).join(', ')}`);
  if (missing.length) changes.push(`index ${layer.name}: ${missing.map((index) => index.fields).join(', ')}`);
  if (fields.length) fieldAdditions.push({ id, fields });
}

if (!changes.length) {
  console.log('The service already matches the schema. Nothing to do.');
  process.exit(0);
}
console.log(changes.join('\n'));
if (dryRun) {
  console.log('Dry run: nothing was changed.');
  process.exit(0);
}

if (newDatasets.length) {
  await request(`${adminUrl}/addToDefinition`, { addToDefinition: { layers: [], tables: newDatasets } });
  console.log(`Added ${newDatasets.map((dataset) => dataset.name).join(', ')}.`);
}
for (const { id, fields } of fieldAdditions) {
  await request(`${adminUrl}/${id}/addToDefinition`, { addToDefinition: { fields } });
  console.log(`Added ${fields.length} fields to dataset ${id}.`);
}
// Indexes last, so every field they name exists. They only speed up lookups,
// and ArcGIS refuses them while the service has Sync enabled.
const after = await request(service);
const entries = [...(after.layers || []), ...(after.tables || [])];
const syncEnabled = after.syncEnabled || /\bSync\b/.test(after.capabilities || '');
for (const model of Object.keys(datasets)) {
  const entry = entries.find((value) => value.name === datasets[model].name);
  if (!entry) throw new Error(`${datasets[model].name} was not created.`);
  const missing = missingIndexes(model, await request(`${service}/${entry.id}`));
  if (!missing.length || syncEnabled) continue;
  await request(`${adminUrl}/${entry.id}/addToDefinition`, { addToDefinition: { indexes: missing } });
  console.log(`Added ${missing.length} indexes to ${datasets[model].name}.`);
}
if (syncEnabled) console.warn('Sync is enabled on the service, so no indexes were added. Disable Sync to add them.');
console.log('Done.');
