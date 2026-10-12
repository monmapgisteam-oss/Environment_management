// Prepares the survey records in the private application Feature Service:
//   node scripts/arcgis-survey.cjs schema  – add survey fields/attachments to layer 0
//                                            and create the repeat_1 table with its relationship
// Safe to re-run: existing fields and tables are skipped.
require('./register-typescript.cjs');
const { arcgisHeaders } = require('../lib/arcgis/headers.ts');
const { serviceToken } = require('../lib/arcgis/credentials.ts');
require('@next/env').loadEnvConfig(process.cwd());

// Survey123 matches a form repeat to the table with the same name.
const REPEAT_TABLE = 'repeat_1';
const OLD_REPEAT_TABLE = 'tailan_surveyRepeat';
const RELATIONSHIP = 'survey_repeat_1';
const REPORT_TYPES = ['Жилийн төлөвлөгөө', 'Биелэлтийн тайлан', 'Жилийн тайлан'];

function target() {
  const url = process.env.ARCGIS_DATA_SERVICE_URL?.trim().replace(/\/$/, '');
  if (!url || !/^https:\/\/[^?#]+\/rest\/services\/.+\/FeatureServer$/i.test(url)) throw new Error('Invalid ARCGIS_DATA_SERVICE_URL.');
  return url;
}
function adminUrl() { return target().replace('/rest/services/', '/rest/admin/services/'); }

async function request(url, values = {}, token) {
  token ??= await serviceToken();
  const body = new URLSearchParams({ f: 'json', token });
  for (const [key, value] of Object.entries(values)) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  const response = await fetch(url, { method: 'POST', body, headers: arcgisHeaders(), signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}.`);
  const json = await response.json();
  if (json.error) throw new Error(`ArcGIS ${json.error.code}: ${json.error.message} ${(json.error.details || []).join('; ')}`);
  if (json.status === 'error' || json.success === false) throw new Error(`ArcGIS operation failed: ${JSON.stringify(json)}`);
  return json;
}
const text = (name, alias, length = 255, extra = {}) => ({ name, alias, type: 'esriFieldTypeString', length, nullable: true, editable: true, ...extra });
const date = (name, alias) => ({ name, alias, type: 'esriFieldTypeDate', length: 8, nullable: true, editable: true });
const number = (name) => ({ name, alias: name, type: 'esriFieldTypeDouble', nullable: true, editable: true });

async function schema() {
  const adminToken = process.env.ARCGIS_ADMIN_TOKEN?.trim();
  if (!adminToken) throw new Error('Set ARCGIS_ADMIN_TOKEN to a service-owner token (see npm run arcgis:login).');
  const layer = await request(`${target()}/0`);
  const existing = new Set(layer.fields.map((field) => field.name.toLowerCase()));
  const fields = [
    text('Report_type', 'Тайлангийн төрөл', 255, {
      domain: { type: 'codedValue', name: 'cvd_Report_type', codedValues: REPORT_TYPES.map((value) => ({ name: value, code: value })) },
    }),
    text('project_name', 'Төслийн нэр'), text('Organization', 'Байгууллага'), text('Register', 'Регистр'),
    date('Project_date', 'Огноо'), text('Description', 'Тайлбар', 1000),
    text('aimag', 'Аймаг'), text('sum', 'Сум'), text('bag', 'Баг'),
  ].filter((field) => !existing.has(field.name.toLowerCase()));
  if (fields.length) {
    await request(`${adminUrl()}/0/addToDefinition`, { addToDefinition: { fields } }, adminToken);
    console.log(`Added ${fields.length} survey fields to layer 0.`);
  }
  if (!layer.hasAttachments) {
    await request(`${adminUrl()}/0/updateDefinition`, { updateDefinition: { hasAttachments: true } }, adminToken);
    console.log('Enabled attachments on layer 0.');
  }
  let root = await request(target());
  const renamed = (root.tables || []).find((table) => table.name === OLD_REPEAT_TABLE);
  if (renamed) {
    await request(`${adminUrl()}/${renamed.id}/updateDefinition`, { updateDefinition: { name: REPEAT_TABLE } }, adminToken);
    console.log(`Renamed table ${OLD_REPEAT_TABLE} to ${REPEAT_TABLE}.`);
    root = await request(target());
  }
  if (!(root.tables || []).some((table) => table.name === REPEAT_TABLE)) {
    const id = Math.max(...[...root.layers, ...(root.tables || [])].map((entry) => entry.id)) + 1;
    await request(`${adminUrl()}/addToDefinition`, { addToDefinition: { tables: [{
      id, name: REPEAT_TABLE, type: 'Table', displayField: 'Member_name',
      objectIdField: 'objectid', globalIdField: 'globalid', hasAttachments: true,
      capabilities: 'Query,Create,Update,Delete,Editing',
      fields: [
        { name: 'objectid', type: 'esriFieldTypeOID', alias: 'ObjectID', nullable: false, editable: false },
        { name: 'globalid', type: 'esriFieldTypeGlobalID', alias: 'GlobalID', length: 38, nullable: false, editable: false },
        text('Member_name', 'Гишүүний нэр'),
        ...[1, 2, 3, 4, 5, 6, 7, 8].map((i) => number(`Q${i}`)),
        { name: 'parentglobalid', type: 'esriFieldTypeGUID', alias: 'parentglobalid', length: 38, nullable: true, editable: true },
      ],
    }] } }, adminToken);
    console.log(`Created table ${REPEAT_TABLE} (id ${id}).`);
    root = await request(target());
  }
  // Composite one-to-many relationship layer 0 -> repeat table, as Survey123 publishes it.
  const tableId = root.tables.find((table) => table.name === REPEAT_TABLE).id;
  const [origin, destination] = await Promise.all([request(`${target()}/0`), request(`${target()}/${tableId}`)]);
  const base = { id: 1, name: RELATIONSHIP, cardinality: 'esriRelCardinalityOneToMany', composite: true };
  // Relationships are only accepted through the service-level addToDefinition.
  const hasOrigin = (origin.relationships || []).some((relationship) => relationship.relatedTableId === tableId);
  const hasDestination = (destination.relationships || []).some((relationship) => relationship.relatedTableId === 0);
  if (!hasOrigin || !hasDestination) {
    await request(`${adminUrl()}/addToDefinition`, { addToDefinition: {
      layers: hasOrigin ? [] : [{ id: 0, relationships: [{ ...base, relatedTableId: tableId, role: 'esriRelRoleOrigin', keyField: 'globalid' }] }],
      tables: hasDestination ? [] : [{ id: tableId, relationships: [{ ...base, relatedTableId: 0, role: 'esriRelRoleDestination', keyField: 'parentglobalid' }] }],
    } }, adminToken);
    console.log(`Added relationship ${RELATIONSHIP} between layer 0 and ${REPEAT_TABLE}.`);
  }
  console.log('Survey schema is ready.');
}

const command = process.argv[2];
(command === 'schema' ? schema() : Promise.reject(new Error('Use schema.')))
  .catch((error) => { console.error(error.message); process.exitCode = 1; });
