const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { serviceToken, clearCredentialCache } = require('../lib/arcgis/credentials.ts');
const { arcgisHeaders } = require('../lib/arcgis/headers.ts');
const originalFetch = global.fetch;
const originalNow = Date.now;

beforeEach(() => {
  clearCredentialCache();
  delete process.env.ARCGIS_DATA_TOKEN;
  process.env.ARCGIS_CLIENT_ID = 'test-client';
  process.env.ARCGIS_CLIENT_SECRET = 'test-secret';
  process.env.ARCGIS_PORTAL_URL = 'https://www.arcgis.com';
  process.env.ARCGIS_HTTP_REFERER = 'http://localhost:3000/';
});
afterEach(() => { global.fetch = originalFetch; Date.now = originalNow; });

test('concurrent callers share one token request and cached tokens renew before expiry', async () => {
  let now = 100000;
  let requests = 0;
  Date.now = () => now;
  global.fetch = async (url, options) => {
    requests++;
    assert.equal(url, 'https://www.arcgis.com/sharing/rest/oauth2/token');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Referer, 'http://localhost:3000/');
    assert.equal(options.body.get('client_secret'), 'test-secret');
    return new Response(JSON.stringify({ access_token: `token-${requests}`, expires_in: 120 }));
  };
  assert.deepEqual(await Promise.all([serviceToken(), serviceToken(), serviceToken()]), ['token-1', 'token-1', 'token-1']);
  assert.equal(requests, 1);
  now += 59000;
  assert.equal(await serviceToken(), 'token-1');
  now += 2000;
  assert.equal(await serviceToken(), 'token-2');
  assert.equal(requests, 2);
});

test('failed exchanges do not poison future refreshes or reveal credentials', async () => {
  global.fetch = async () => new Response(JSON.stringify({ error: { message: 'test-secret' } }));
  await assert.rejects(serviceToken(), (error) => !error.message.includes('test-secret') && /rejected/.test(error.message));
  global.fetch = async () => new Response(JSON.stringify({ access_token: 'working', expires_in: 7200 }));
  assert.equal(await serviceToken(), 'working');
});

test('static tokens remain supported and incomplete OAuth configuration fails clearly', async () => {
  delete process.env.ARCGIS_CLIENT_ID;
  delete process.env.ARCGIS_CLIENT_SECRET;
  process.env.ARCGIS_DATA_TOKEN = 'static-token';
  assert.equal(await serviceToken(), 'static-token');
  process.env.ARCGIS_CLIENT_ID = 'incomplete';
  await assert.rejects(serviceToken(), /Both/);
});

test('Referer restrictions are optional and invalid URLs are rejected', () => {
  assert.deepEqual(arcgisHeaders(), { Referer: 'http://localhost:3000/' });
  delete process.env.ARCGIS_HTTP_REFERER;
  assert.deepEqual(arcgisHeaders(), {});
  process.env.ARCGIS_HTTP_REFERER = 'file:///tmp/token';
  assert.throws(arcgisHeaders, /HTTP/);
});
