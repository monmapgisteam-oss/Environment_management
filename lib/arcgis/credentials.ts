import { arcgisHeaders } from './headers';

// OAuth application credentials stay server-side. Cache tokens until one minute
// before expiration and share concurrent refreshes within a server process.
let cached: { key: string; token: string; expiresAt: number } | undefined;
let pending: { key: string; promise: Promise<string> } | undefined;

export function clearCredentialCache() { cached = undefined; pending = undefined; }

export async function serviceToken(): Promise<string> {
  const clientId = process.env.ARCGIS_CLIENT_ID?.trim();
  const clientSecret = process.env.ARCGIS_CLIENT_SECRET?.trim();
  if (!clientId && !clientSecret) {
    const token = process.env.ARCGIS_DATA_TOKEN?.trim();
    if (!token) throw new Error('Configure ARCGIS_CLIENT_ID and ARCGIS_CLIENT_SECRET, or ARCGIS_DATA_TOKEN.');
    return token;
  }
  if (!clientId || !clientSecret) throw new Error('Both ArcGIS OAuth client ID and client secret are required.');
  const portal = (process.env.ARCGIS_PORTAL_URL || 'https://www.arcgis.com').replace(/\/$/, '');
  if (!/^https:\/\/[^?#]+$/.test(portal)) throw new Error('ARCGIS_PORTAL_URL must be an HTTPS portal URL.');
  const key = `${portal}\n${clientId}\n${clientSecret}`;
  if (cached?.key === key && Date.now() < cached.expiresAt - 60_000) return cached.token;
  if (pending?.key === key) return pending.promise;
  const promise = (async () => {
    const response = await fetch(`${portal}/sharing/rest/oauth2/token`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30_000),
      headers: arcgisHeaders(),
      body: new URLSearchParams({ f: 'json', grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    });
    if (!response.ok) throw new Error(`ArcGIS OAuth request failed (HTTP ${response.status}).`);
    const result = await response.json();
    if (result.error || typeof result.access_token !== 'string' || typeof result.expires_in !== 'number' || result.expires_in <= 0) {
      throw new Error('ArcGIS rejected the OAuth application credentials.');
    }
    cached = { key, token: result.access_token, expiresAt: Date.now() + result.expires_in * 1000 };
    return cached.token;
  })();
  pending = { key, promise };
  try { return await promise; }
  finally { if (pending?.promise === promise) pending = undefined; }
}
