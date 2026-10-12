// One-time owner authorization for provisioning. No passwords/tokens in the UI.
require('./register-typescript.cjs');
const http = require('node:http');
const fs = require('node:fs');
const { randomBytes, createHash, timingSafeEqual } = require('node:crypto');
const { spawn } = require('node:child_process');
const { arcgisHeaders } = require('../lib/arcgis/headers.ts');
require('@next/env').loadEnvConfig(process.cwd());

const clientId = process.env.ARCGIS_OWNER_CLIENT_ID || process.env.ARCGIS_CLIENT_ID;
const clientSecret = process.env.ARCGIS_OWNER_CLIENT_ID
  ? process.env.ARCGIS_OWNER_CLIENT_SECRET
  : process.env.ARCGIS_CLIENT_SECRET;
const portal = (process.env.ARCGIS_PORTAL_URL || 'https://www.arcgis.com').replace(/\/$/, '');
const service = process.env.ARCGIS_DATA_SERVICE_URL;
if (!clientId || !service) throw new Error('Configure the ArcGIS client ID and service URL first.');
function serverAdminUrl() {
  const match = service.replace(/\/$/, '').match(/^(https:\/\/[^?#]+)\/rest\/services\/(.+)\/FeatureServer$/i);
  if (!match) throw new Error('The target must be a hosted FeatureServer URL inside a service folder.');
  const [folder, serviceName] = match[2].split(/\/(?!.*\/)/);
  if (!folder || !serviceName) throw new Error('The target must be a hosted FeatureServer URL inside a service folder.');
  return `${match[1]}/rest/admin/services/${folder}/${serviceName}/FeatureServer`;
}
const redirect = 'http://localhost:3000/';
const state = randomBytes(32).toString('hex');
const verifier = randomBytes(48).toString('base64url');
const authorize = new URL(`${portal}/sharing/rest/oauth2/authorize`);
authorize.search = new URLSearchParams({
  client_id: clientId, redirect_uri: redirect, response_type: 'code', state,
  code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256',
}).toString();
let exchanging = false;
let complete = false;

async function request(url, fields) {
  const response = await fetch(url, {
    method: 'POST', headers: arcgisHeaders(), signal: AbortSignal.timeout(30_000),
    body: new URLSearchParams({ f: 'json', ...fields }),
  });
  const value = await response.json();
  if (!response.ok || value.error) throw new Error(`ArcGIS rejected the authorization (code ${value.error?.code || response.status}).`);
  if (value.status === 'error' || (typeof value.code === 'number' && value.code >= 400)) {
    const details = Array.isArray(value.messages) ? value.messages.join('; ') : (value.message || 'ArcGIS rejected the authorization.');
    throw new Error(`ArcGIS rejected the authorization (code ${value.code || 'operation'}): ${details}`);
  }
  return value;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['localhost:3000', '127.0.0.1:3000'].includes(req.headers.host)) { res.writeHead(400).end(); return; }
  const url = new URL(req.url, redirect);
  if (req.method !== 'GET') { res.writeHead(405).end(); return; }
  if (url.pathname === '/complete' && complete) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('ArcGIS owner authorization saved locally. You can close this tab.');
    setTimeout(() => { clearTimeout(deadline); server.close(); }, 1000);
    return;
  }
  if (url.pathname !== '/') { res.writeHead(404).end(); return; }
  if (!url.searchParams.has('code') && !url.searchParams.has('error')) {
    res.writeHead(302, { Location: authorize.toString() }).end(); return;
  }
  const receivedState = Buffer.from(url.searchParams.get('state') || '');
  const expectedState = Buffer.from(state);
  if (receivedState.length !== expectedState.length || !timingSafeEqual(receivedState, expectedState)) {
    res.writeHead(400).end('Invalid authorization state. Start again at http://localhost:3000/.'); return;
  }
  if (exchanging || complete) { res.writeHead(409).end('Authorization is already being processed.'); return; }
  if (url.searchParams.has('error')) { res.writeHead(400).end('ArcGIS sign-in was cancelled or rejected.'); return; }
  exchanging = true;
  try {
    const token = await request(`${portal}/sharing/rest/oauth2/token`, {
      grant_type: 'authorization_code', client_id: clientId, redirect_uri: redirect,
      code: url.searchParams.get('code'), code_verifier: verifier,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
    });
    if (typeof token.access_token !== 'string') throw new Error('ArcGIS did not issue an access token.');
    // Verify ownership/administration before retaining the token.
    const root = await request(service, { token: token.access_token });
    const item = await request(`${portal}/sharing/rest/content/items/${root.serviceItemId}`, { token: token.access_token });
    if (item.access !== 'private') throw new Error('The application service must remain private.');
    await request(serverAdminUrl(), { token: token.access_token });
    const values = { ARCGIS_ADMIN_TOKEN: token.access_token, ARCGIS_OWNER: item.owner };
    let content = fs.readFileSync('.env.local', 'utf8');
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}=.*$`, 'm');
      const line = `${key}=${JSON.stringify(value)}`;
      content = pattern.test(content) ? content.replace(pattern, () => line) : `${content.trimEnd()}\n${line}\n`;
    }
    fs.writeFileSync('.env.local', content, { mode: 0o600 });
    fs.chmodSync('.env.local', 0o600);
    complete = true;
    console.log('Service-owner authorization verified and saved. Ready to provision.');
    res.writeHead(303, { Location: '/complete' }).end();
  } catch (error) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.writeHead(403).end(`${error.message} Sign in with the service owner or an organization administrator.`);
    console.error(error.message);
  } finally { exchanging = false; }
});
const deadline = setTimeout(() => { console.log('Owner sign-in timed out. Rerun npm run arcgis:login to try again.'); server.close(); }, 20 * 60 * 1000);
server.on('error', (error) => {
  clearTimeout(deadline);
  console.error(error.code === 'EADDRINUSE' ? 'Port 3000 is in use. Stop the development server, then rerun npm run arcgis:login.' : error.message);
  process.exitCode = 1;
});
server.on('close', () => {
  if (!process.argv.includes('--restore-dev')) return;
  console.log('Restoring the project development server on port 3000.');
  const child = spawn('npm', ['run', 'dev'], { cwd: process.cwd(), stdio: 'inherit', env: process.env });
  child.on('error', () => { console.error('Could not restart the development server; run npm run dev.'); process.exitCode = 1; });
});
server.listen(3000, '127.0.0.1', () => console.log('Open http://localhost:3000/ and sign in as the service owner. Waiting for authorization (20 minutes).'));
