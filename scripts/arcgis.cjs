require('./register-typescript.cjs');
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { schema, fieldTypes, definition } = require('./arcgis-schema.cjs');
const { serviceToken } = require('../lib/arcgis/credentials.ts');
const { arcgisHeaders } = require('../lib/arcgis/headers.ts');

// Load the user's legacy `env` filename without executing its contents.
// Real process variables and normal Next.js environment files take precedence.
require('@next/env').loadEnvConfig(process.cwd());
if (fs.existsSync('env')) {
  process.loadEnvFile(path.resolve('env'));
}

function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Configure ${name} in .env.local or env.`);
  return value;
}
function portal() { return (process.env.ARCGIS_PORTAL_URL || 'https://www.arcgis.com').replace(/\/$/, ''); }
function target() {
  const url = required('ARCGIS_DATA_SERVICE_URL').replace(/\/$/, '');
  if (!/^https:\/\/[^?#]+\/FeatureServer$/i.test(url)) throw new Error('Invalid ARCGIS_DATA_SERVICE_URL.');
  return url;
}
function adminUrl() {
  const match = target().match(/^(https:\/\/[^?#]+)\/rest\/services\/(.+)\/FeatureServer$/i);
  if (!match) throw new Error('Could not determine the hosted service admin URL.');
  const [folder, serviceName] = match[2].split(/\/(?!.*\/)/);
  if (!folder || !serviceName) throw new Error('The target must be a hosted Feature Service inside a service folder.');
  // Use the hosted-service REST admin route. The federated Server Admin API
  // (/admin/services/...) rejects portal OAuth app tokens with HTTP 403.
  return `${match[1]}/rest/admin/services/${folder}/${serviceName}/FeatureServer`;
}
async function request(url, values = {}, token) {
  token ??= await serviceToken();
  const body = new URLSearchParams({ f: 'json', ...(token ? { token } : {}) });
  for (const [key, value] of Object.entries(values)) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  const response = await fetch(url, { method: 'POST', body, headers: arcgisHeaders(), signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error(`ArcGIS HTTP ${response.status}.`);
  const json = await response.json();
  if (json.error) throw new Error(`ArcGIS ${json.error.code}: ${json.error.message}`);
  // ArcGIS Enterprise Server Admin endpoints may return HTTP 200 together with
  // a structured status error. Treat that exactly like a REST error so a schema
  // provisioning run cannot claim success when nothing was persisted.
  if (json.status === 'error' || (typeof json.code === 'number' && json.code >= 400)) {
    const details = Array.isArray(json.messages) ? json.messages.join('; ') : (json.message || 'ArcGIS operation failed.');
    throw new Error(`ArcGIS ${json.code || 'operation'}: ${details}`);
  }
  if (json.success === false) throw new Error('ArcGIS operation failed.');
  return json;
}
function saveLocal(values) {
  const filename = path.resolve('.env.local');
  let text = fs.existsSync(filename) ? fs.readFileSync(filename, 'utf8') : '';
  for (const [key, value] of Object.entries(values)) {
    const line = `${key}=${JSON.stringify(value)}`;
    const pattern = new RegExp(`^${key}=.*$`, 'm');
    text = pattern.test(text) ? text.replace(pattern, () => line) : `${text.trimEnd()}\n${line}\n`;
    process.env[key] = value;
  }
  fs.writeFileSync(filename, text, { mode: 0o600 });
}

async function checkPrivate() {
  const root = await request(target());
  if (!root.serviceItemId) throw new Error('The target must be a hosted service with a portal item.');
  const item = await request(`${portal()}/sharing/rest/content/items/${root.serviceItemId}`);
  const publicTestService = process.env.ARCGIS_ALLOW_PUBLIC_TEST_SERVICE === 'true';
  if (item.access !== 'private' && !publicTestService) {
    throw new Error('The application service must be private before storing user credentials or application records.');
  }
  if (item.access !== 'private' && publicTestService) {
    console.warn('Using a public Feature Service for testing only. Never store production users, credentials, or uploads here.');
  }
  return root;
}

async function create() {
  if (process.env.ARCGIS_DATA_SERVICE_URL) {
    await checkPrivate();
    console.log('A private target is already configured. Continuing with that service.');
    return;
  }
  const owner = required('ARCGIS_OWNER');
  const token = required('ARCGIS_ADMIN_TOKEN');
  const name = process.env.ARCGIS_SERVICE_NAME || `tailan_app_${Date.now()}`;
  const result = await request(`${portal()}/sharing/rest/content/users/${encodeURIComponent(owner)}/createService`, {
    outputType: 'featureService', createParameters: {
      name, serviceDescription: 'Private Tailan application records and attachments',
      hasStaticData: false, maxRecordCount: 1000, supportedQueryFormats: 'JSON',
      capabilities: 'Query,Create,Update,Delete,Editing', allowGeometryUpdates: true,
      spatialReference: { wkid: 4326 },
      initialExtent: { xmin: 87, ymin: 41, xmax: 120, ymax: 53, spatialReference: { wkid: 4326 } },
      units: 'esriDecimalDegrees',
    },
  }, token);
  if (!result.serviceurl) throw new Error('ArcGIS did not return the new service URL.');
  saveLocal({
    ARCGIS_PORTAL_URL: portal(), ARCGIS_DATA_SERVICE_URL: result.serviceurl,
    ARCGIS_DATA_TOKEN: process.env.ARCGIS_DATA_TOKEN || token,
    JWT_SECRET: process.env.JWT_SECRET || randomBytes(48).toString('hex'),
  });
  await checkPrivate();
  console.log(`Created private service: ${result.serviceurl}`);
  console.log('Saved runtime settings to .env.local. Use a renewable server-side credential before production deployment.');
}

async function provision() {
  const publicTestService = process.env.ARCGIS_ALLOW_PUBLIC_TEST_SERVICE === 'true';
  // Schema changes run the server's PublishingTools GP service, which rejects
  // app-only tokens. Prefer the owner token saved by `npm run arcgis:login`.
  const adminToken = process.env.ARCGIS_ADMIN_TOKEN?.trim()
    || (publicTestService ? await serviceToken() : required('ARCGIS_ADMIN_TOKEN'));
  const root = await checkPrivate();
  const existing = [...(root.layers || []), ...(root.tables || [])];
  let id = Math.max(-1, ...existing.map((layer) => layer.id)) + 1;
  const additions = Object.keys(schema).filter((model) => !existing.some((layer) => layer.name === schema[model].name)).map((model) => definition(model, id++, root.spatialReference));
  if (additions.length) {
    await request(`${adminUrl()}/addToDefinition`, { addToDefinition: {
      layers: additions.filter((layer) => layer.type === 'Feature Layer'),
      tables: additions.filter((layer) => layer.type === 'Table'),
    } }, adminToken);
    console.log(`Created ${additions.length} empty application datasets.`);
  } else console.log('All application datasets already exist. No records were changed.');
  await provisionIndexes(adminToken);
  await verify();
}

// ArcGIS Enterprise drops index definitions sent with new datasets in a
// service-level addToDefinition, so add any missing ones per dataset.
async function provisionIndexes(adminToken) {
  const root = await request(target());
  const existing = [...(root.layers || []), ...(root.tables || [])];
  for (const model of Object.keys(schema)) {
    const summary = existing.find((entry) => entry.name === schema[model].name);
    if (!summary) continue;
    const layer = await request(`${target()}/${summary.id}`);
    const present = (layer.indexes || []).map((index) => index.fields.toLowerCase());
    const missing = definition(model, summary.id).indexes.filter((index) => !present.includes(index.fields.toLowerCase()));
    if (!missing.length) continue;
    await request(`${adminUrl()}/${summary.id}/addToDefinition`, { addToDefinition: { indexes: missing } }, adminToken);
    console.log(`Added ${missing.length} indexes to ${schema[model].name}.`);
  }
}

async function verify() {
  const root = await checkPrivate();
  const existing = [...(root.layers || []), ...(root.tables || [])];
  for (const [model, spec] of Object.entries(schema)) {
    const summary = existing.find((entry) => entry.name === spec.name);
    if (!summary) throw new Error(`Missing dataset ${spec.name}.`);
    const layer = await request(`${target()}/${summary.id}`);
    for (const [name, field] of Object.entries(spec.fields)) {
      const actual = layer.fields.find((entry) => entry.name.toLowerCase() === `app_${name}`.toLowerCase());
      if (!actual || actual.type !== fieldTypes[field.type]) throw new Error(`Incorrect or missing field ${spec.name}.app_${name}.`);
      if (field.length && actual.length < field.length) throw new Error(`Field too short: ${spec.name}.app_${name}.`);
      if (field.unique && !layer.indexes?.some((index) => index.isUnique && index.fields.toLowerCase() === `app_${name}`.toLowerCase())) {
        throw new Error(`Missing unique index: ${spec.name}.app_${name}.`);
      }
    }
    if (spec.spatial && layer.geometryType !== 'esriGeometryPoint') throw new Error('Locations must be a point layer.');
    if (spec.attachments && !layer.hasAttachments) throw new Error('Uploads table must support attachments.');
    if (!layer.advancedQueryCapabilities?.supportsPagination) throw new Error(`${spec.name} must support pagination.`);
    if (layer.supportsRollbackOnFailureParameter === false) throw new Error(`${spec.name} must support rollbackOnFailure.`);
    console.log(`Verified ${model} (dataset ${summary.id}).`);
  }
  console.log('Private service schema verified.');
}

async function inspect() {
  const root = await checkPrivate();
  const item = await request(`${portal()}/sharing/rest/content/items/${root.serviceItemId}`);
  let adminAccess = false;
  let adminError;
  try { await request(adminUrl()); adminAccess = true; }
  catch (error) { adminError = error.message; }
  console.log(JSON.stringify({
    private: item.access === 'private', owner: item.owner,
    capabilities: root.capabilities, adminAccess, adminError,
    datasets: [...(root.layers || []), ...(root.tables || [])].map(({ id, name }) => ({ id, name })),
  }, null, 2));
}

async function inspectAuth(useAdmin = false) {
  const token = useAdmin ? required('ARCGIS_ADMIN_TOKEN') : await serviceToken();
  const referer = process.argv[3];
  for (const [label, url] of [
    ['portal', `${portal()}/sharing/rest/portals/self`],
    ['service', target()],
    ['admin', adminUrl()],
  ]) {
    try {
      const requestUrl = new URL(url);
      requestUrl.searchParams.set('f', 'json');
      requestUrl.searchParams.set('token', token);
      const response = await fetch(requestUrl, {
        signal: AbortSignal.timeout(30_000),
        headers: referer ? { Referer: referer } : arcgisHeaders(),
      });
      const value = await response.json();
      if (value.error) throw new Error(`ArcGIS ${value.error.code}: ${value.error.message}`);
      if (value.status === 'error' || (typeof value.code === 'number' && value.code >= 400)) {
        const details = Array.isArray(value.messages) ? value.messages.join('; ') : (value.message || 'ArcGIS operation failed.');
        throw new Error(`ArcGIS ${value.code || 'operation'}: ${details}`);
      }
      console.log(JSON.stringify({ label, accessible: true, organization: value.id,
        privileges: value.appInfo?.privileges, itemAccess: value.appInfo?.itemAccess,
        serviceItemId: value.serviceItemId, datasets: [...(value.layers || []), ...(value.tables || [])].map(({ id, name }) => ({ id, name })),
      }));
    } catch (error) { console.log(JSON.stringify({ label, accessible: false, error: error.message })); }
  }
}

async function inspectApp() {
  const token = await serviceToken();
  const value = await request(`${portal()}/sharing/rest/oauth2/apps/${required('ARCGIS_CLIENT_ID')}`, {}, token);
  console.log(JSON.stringify({
    redirect_uris: value.redirect_uris, redirectUris: value.redirectUris,
    appType: value.appType, registered: !!value.client_id,
  }, null, 2));
}

async function inspectRedirect() {
  for (const redirect of ['http://localhost:3000/', 'http://localhost:3000']) {
    const url = new URL(`${portal()}/sharing/rest/oauth2/authorize`);
    url.search = new URLSearchParams({ client_id: required('ARCGIS_CLIENT_ID'), response_type: 'code', redirect_uri: redirect }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
    const html = await response.text();
    console.log(JSON.stringify({ redirect, status: response.status,
      invalidRedirect: /invalid redirect_uri/i.test(html),
      title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1],
    }));
  }
}

async function bootstrap() {
  process.env.ARCGIS_DATA_TOKEN ||= required('ARCGIS_ADMIN_TOKEN');
  await verify();
  const data = require('../lib/arcgis/data.ts').default;
  if (await data.user.count()) throw new Error('Bootstrap only runs with an empty users table.');
  const password = required('ARCGIS_BOOTSTRAP_PASSWORD');
  if (password.length < 12) throw new Error('Choose a bootstrap password of at least 12 characters.');
  const { hashPassword } = require('../lib/password.ts');
  await data.user.create({ data: {
    name: process.env.ARCGIS_BOOTSTRAP_NAME || 'Administrator',
    email: required('ARCGIS_BOOTSTRAP_EMAIL'), password: hashPassword(password), role: 'admin',
  } });
  console.log('Created the first administrator. No sample reports or existing data were imported.');
}

async function main() {
  const command = process.argv[2];
  if (command === 'schema') {
    const all = Object.keys(schema).map((model, id) => definition(model, id));
    console.log(JSON.stringify({ layers: all.filter((layer) => layer.type === 'Feature Layer'), tables: all.filter((layer) => layer.type === 'Table') }, null, 2));
  } else if (command === 'create') { await create(); await provision(); }
  else if (command === 'provision') await provision();
  else if (command === 'verify') await verify();
  else if (command === 'inspect') await inspect();
  else if (command === 'inspect-auth') await inspectAuth();
  else if (command === 'inspect-admin') await inspectAuth(true);
  else if (command === 'inspect-app') await inspectApp();
  else if (command === 'inspect-redirect') await inspectRedirect();
  else if (command === 'bootstrap') await bootstrap();
  else throw new Error('Use create, provision, verify, schema, or bootstrap.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
