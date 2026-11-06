const test = require('node:test');
const assert = require('node:assert/strict');
const { serviceToken } = require('../lib/db/arcgis.ts');

function configure(t, name) {
  for (const [key, value] of Object.entries({
    ARCGIS_PORTAL_URL: 'https://arcgis.example.test/gis',
    ARCGIS_CLIENT_ID: name,
    ARCGIS_CLIENT_SECRET: 'test-secret',
    ARCGIS_HTTP_REFERER: '',
  })) {
    const original = process.env[key];
    process.env[key] = value;
    t.after(() => {
      if (original === undefined) delete process.env[key];
      else process.env[key] = original;
    });
  }
  t.after(() => t.mock.restoreAll());
}

const tokenResponse = () => Response.json({ access_token: 'test-token', expires_in: 3600 });
const dnsError = () => new TypeError('fetch failed', { cause: Object.assign(new Error('DNS unavailable'), { code: 'ENOTFOUND' }) });

test('OAuth retries a DNS failure, shares the refresh, and caches the recovered token', async (t) => {
  configure(t, 'transient-dns');
  const signals = [];
  const fetch = t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(url, 'https://arcgis.example.test/gis/sharing/rest/oauth2/token');
    signals.push(init.signal);
    if (signals.length === 1) throw dnsError();
    return tokenResponse();
  });
  assert.deepEqual(await Promise.all([serviceToken(), serviceToken()]), ['test-token', 'test-token']);
  assert.equal(await serviceToken(), 'test-token');
  assert.equal(fetch.mock.callCount(), 2);
  assert.notEqual(signals[0], signals[1]);
});

test('persistent DNS failure stops after one retry and a later request can recover', async (t) => {
  configure(t, 'persistent-dns');
  const fetch = t.mock.method(globalThis, 'fetch', async () => { throw dnsError(); });
  await assert.rejects(serviceToken(), (error) => error.cause?.code === 'ENOTFOUND');
  assert.equal(fetch.mock.callCount(), 2);
  fetch.mock.mockImplementation(async () => tokenResponse());
  assert.equal(await serviceToken(), 'test-token');
  assert.equal(fetch.mock.callCount(), 3);
});

test('OAuth does not retry a credential rejection or an ambiguous transport failure', async (t) => {
  configure(t, 'rejected');
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ error: { code: 400 } }));
  await assert.rejects(serviceToken(), /rejected the OAuth application credentials/);
  assert.equal(fetch.mock.callCount(), 1);
  fetch.mock.mockImplementation(async () => { throw new TypeError('fetch failed', { cause: { code: 'ECONNRESET' } }); });
  await assert.rejects(serviceToken(), { cause: { code: 'ECONNRESET' } });
  assert.equal(fetch.mock.callCount(), 2);
});
