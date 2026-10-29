// Server-side transport to the private ArcGIS feature service that holds the
// application records and files. Never import this from client components:
// the service credential must not reach a browser.

/** Match the referrer restriction configured on the ArcGIS credential. */
export function arcgisHeaders(): Record<string, string> {
  const referer = process.env.ARCGIS_HTTP_REFERER?.trim();
  if (!referer) return {};
  const parsed = new URL(referer);
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) {
    throw new Error('ARCGIS_HTTP_REFERER must be an HTTP(S) application URL.');
  }
  return { Referer: referer };
}

export function serviceUrl(): string {
  const value = process.env.ARCGIS_DATA_SERVICE_URL?.trim().replace(/\/$/, '');
  if (!value || !/^https:\/\/[^?#]+\/FeatureServer$/i.test(value)) {
    throw new Error('Set ARCGIS_DATA_SERVICE_URL to the private application FeatureServer URL.');
  }
  return value;
}

// OAuth application credentials stay server-side. Tokens are cached until one
// minute before they expire, and concurrent refreshes share one request.
let cached: { key: string; token: string; expiresAt: number } | undefined;
let pending: { key: string; promise: Promise<string> } | undefined;

function clearCredentialCache() { cached = undefined; pending = undefined; }

export async function serviceToken(): Promise<string> {
  const clientId = process.env.ARCGIS_CLIENT_ID?.trim();
  const clientSecret = process.env.ARCGIS_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) throw new Error('Set ARCGIS_CLIENT_ID and ARCGIS_CLIENT_SECRET.');
  const portal = process.env.ARCGIS_PORTAL_URL?.trim().replace(/\/$/, '');
  if (!portal || !/^https:\/\/[^?#]+$/.test(portal)) throw new Error('Set ARCGIS_PORTAL_URL to the HTTPS portal URL.');
  const key = `${portal}\n${clientId}\n${clientSecret}`;
  if (cached?.key === key && Date.now() < cached.expiresAt - 60_000) return cached.token;
  if (pending?.key === key) return pending.promise;
  const promise = (async () => {
    const response = await fetch(`${portal}/sharing/rest/oauth2/token`, {
      method: 'POST', cache: 'no-store', signal: AbortSignal.timeout(30_000), headers: arcgisHeaders(),
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

// ArcGIS can invalidate a token before its stated expiry (portal restart,
// revoked credential). 498 = invalid token, 499 = token required.
const TOKEN_ERROR_CODES = new Set([498, 499]);

// Errors raised before a request reaches the server (DNS, TCP connect). Only
// these are retried: the request was never sent, so even edits are safe to repeat.
const CONNECT_ERROR_CODES = new Set(['UND_ERR_CONNECT_TIMEOUT', 'ECONNREFUSED', 'ENOTFOUND', 'EAI_AGAIN', 'ENETUNREACH', 'EHOSTUNREACH']);

async function fetchWithConnectRetry(url: string | URL, init: () => RequestInit): Promise<Response> {
  try {
    return await fetch(url, init());
  } catch (error) {
    const code = (error as { cause?: { code?: string } })?.cause?.code;
    if (!code || !CONNECT_ERROR_CODES.has(code)) throw error;
    await new Promise((resolve) => setTimeout(resolve, 500));
    return fetch(url, init());
  }
}

export async function arcgisRequest<T>(path: string, values: Record<string, unknown> = {}, retried = false): Promise<T> {
  const body = new URLSearchParams({ f: 'json', token: await serviceToken() });
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const response = await fetchWithConnectRetry(`${serviceUrl()}${path ? `/${path}` : ''}`, () => ({
    method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(60_000), headers: arcgisHeaders(),
  }));
  if (!response.ok) throw new Error(`ArcGIS request failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.error && TOKEN_ERROR_CODES.has(result.error.code) && !retried) {
    // Drop the cached token and retry once with a freshly issued one.
    clearCredentialCache();
    return arcgisRequest<T>(path, values, true);
  }
  if (result.error) throw new Error(`ArcGIS request failed (code ${result.error.code}): ${result.error.message || 'Unknown error'}`);
  return result as T;
}

// Raw GET for binary resources such as attachments.
export async function arcgisFetch(path: string, retried = false): Promise<Response> {
  const url = new URL(`${serviceUrl()}/${path}`);
  url.searchParams.set('token', await serviceToken());
  const response = await fetchWithConnectRetry(url, () => ({ cache: 'no-store', signal: AbortSignal.timeout(60_000), headers: arcgisHeaders() }));
  // Binary responses carry token errors as JSON bodies (or HTTP 498/499).
  if (!retried && (TOKEN_ERROR_CODES.has(response.status) || response.headers.get('content-type')?.includes('json'))) {
    const result = await response.clone().json().catch(() => null);
    if (TOKEN_ERROR_CODES.has(response.status) || TOKEN_ERROR_CODES.has(result?.error?.code)) {
      clearCredentialCache();
      return arcgisFetch(path, true);
    }
  }
  return response;
}

// Multipart POST, used to add a file to a record.
export async function arcgisUpload<T>(path: string, form: FormData): Promise<T> {
  form.set('f', 'json');
  form.set('token', await serviceToken());
  const response = await fetch(`${serviceUrl()}/${path}`, {
    method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(60_000), headers: arcgisHeaders(),
  });
  if (!response.ok) throw new Error(`ArcGIS upload failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.error) throw new Error(`ArcGIS upload failed (code ${result.error.code}): ${result.error.message || 'Unknown error'}`);
  return result as T;
}

export type LayerInfo = {
  id: number;
  name: string;
  objectIdField: string;
  geometryType?: string;
  maxRecordCount?: number;
  hasAttachments?: boolean;
  fields: { name: string; type: string; length?: number }[];
};

// Cache only schema, never application records or permissions.
let catalog: { url: string; promise: Promise<Map<string, LayerInfo>> } | undefined;

export async function layerInfo(name: string): Promise<LayerInfo> {
  const url = serviceUrl();
  if (!catalog || catalog.url !== url) {
    const promise = (async () => {
      const root = await arcgisRequest<{ layers?: LayerInfo[]; tables?: LayerInfo[] }>('');
      const entries = [...(root.layers || []), ...(root.tables || [])];
      const layers = await Promise.all(entries.filter((entry) => entry.name.startsWith('tailan_')).map((entry) =>
        arcgisRequest<LayerInfo>(String(entry.id)),
      ));
      return new Map(layers.map((layer) => [layer.name, layer]));
    })();
    catalog = { url, promise };
    promise.catch(() => { if (catalog?.promise === promise) catalog = undefined; });
  }
  const layer = (await catalog.promise).get(name);
  if (!layer) throw new Error(`ArcGIS dataset ${name} is missing. Run npm run arcgis:provision.`);
  return layer;
}

// Enterprise data stores may lowercase field names (app_createdat), while
// applyEdits matches names case-sensitively. Returns the stored name of an
// application field, which carries the "app_" prefix.
export function storedFieldName(layer: LayerInfo, key: string): string {
  const name = `app_${key}`.toLowerCase();
  return layer.fields.find((field) => field.name.toLowerCase() === name)?.name ?? `app_${key}`;
}

export function sqlString(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}

export type Feature = { attributes: Record<string, unknown>; geometry?: unknown };

// Every record of a dataset that matches `where`, in object ID order.
export async function queryFeatures(layer: LayerInfo, where = '1=1'): Promise<Feature[]> {
  const features: Feature[] = [];
  const pageSize = Math.min(layer.maxRecordCount || 1000, 1000);
  for (let offset = 0; ;) {
    const page = await arcgisRequest<{ features: Feature[]; exceededTransferLimit?: boolean }>(`${layer.id}/query`, {
      where, outFields: '*', returnGeometry: false, orderByFields: `${layer.objectIdField} ASC`,
      resultOffset: offset, resultRecordCount: pageSize,
    });
    if (!Array.isArray(page.features)) throw new Error(`Invalid ArcGIS query response for ${layer.name}.`);
    features.push(...page.features);
    if (!page.exceededTransferLimit && page.features.length < pageSize) break;
    if (!page.features.length) throw new Error('ArcGIS pagination made no progress.');
    offset += page.features.length;
  }
  return features;
}

export type ServiceEdit = { id: number; adds?: Feature[]; updates?: Feature[]; deletes?: number[] };
type EditResult = { success: boolean; objectId?: number; error?: { code?: number; description?: string } };
export type ServiceEditResult = { id: number; addResults?: EditResult[]; updateResults?: EditResult[]; deleteResults?: EditResult[] };

// Sends edits to several datasets as one transaction: all apply or none do.
export async function applyEdits(edits: ServiceEdit[]): Promise<ServiceEditResult[]> {
  if (!edits.length) return [];
  const result = await arcgisRequest<ServiceEditResult[]>('applyEdits', {
    edits, rollbackOnFailure: true, honorSequenceOfEdits: true,
  });
  if (!Array.isArray(result)) throw new Error('Invalid ArcGIS edit response.');
  for (const edit of edits) {
    const applied = result.find((entry) => entry.id === edit.id);
    if (!applied) throw new Error('ArcGIS did not confirm every edited dataset.');
    for (const [operation, results] of [['adds', 'addResults'], ['updates', 'updateResults'], ['deletes', 'deleteResults']] as const) {
      if (!edit[operation]?.length) continue;
      const outcomes = applied[results];
      if (outcomes?.length !== edit[operation]!.length || outcomes.some((entry) => !entry.success)) {
        throw new Error(`ArcGIS ${operation} failed; the edit batch was rolled back.`);
      }
    }
  }
  return result;
}
