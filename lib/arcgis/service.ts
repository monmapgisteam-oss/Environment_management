import { serviceToken } from './credentials';
import { arcgisHeaders } from './headers';
export { serviceToken } from './credentials';

/** Server-side transport. Never send the service credential to a browser. */
export function serviceUrl(): string {
  const value = process.env.ARCGIS_DATA_SERVICE_URL?.trim().replace(/\/$/, '');
  if (!value || !/^https:\/\/[^?#]+\/FeatureServer$/i.test(value)) {
    throw new Error('Set ARCGIS_DATA_SERVICE_URL to the private application FeatureServer URL.');
  }
  return value;
}

export async function arcgisRequest<T>(path: string, values: Record<string, unknown> = {}): Promise<T> {
  const body = new URLSearchParams({ f: 'json', token: await serviceToken() });
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) body.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
  }
  const response = await fetch(`${serviceUrl()}${path ? `/${path}` : ''}`, {
    method: 'POST', body, cache: 'no-store', signal: AbortSignal.timeout(60_000),
    headers: arcgisHeaders(),
  });
  if (!response.ok) throw new Error(`ArcGIS request failed (HTTP ${response.status}).`);
  const result = await response.json();
  if (result.error) throw new Error(`ArcGIS request failed (code ${result.error.code}): ${result.error.message || 'Unknown error'}`);
  return result as T;
}

// Raw GET for binary resources such as attachments.
export async function arcgisFetch(path: string): Promise<Response> {
  const url = new URL(`${serviceUrl()}/${path}`);
  url.searchParams.set('token', await serviceToken());
  return fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000), headers: arcgisHeaders() });
}

export type LayerInfo = {
  id: number;
  name: string;
  objectIdField: string;
  maxRecordCount?: number;
  hasAttachments?: boolean;
  fields: { name: string; type: string; length?: number }[];
  indexes?: { fields: string; isUnique: boolean }[];
};

// Cache only schema, never application records or permissions.
let catalog: { url: string; promise: Promise<Map<string, LayerInfo>> } | undefined;
export function clearSchemaCache() { catalog = undefined; }

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

export type Feature = { attributes: Record<string, unknown>; geometry?: unknown };
export type ServiceEdit = { id: number; adds?: Feature[]; updates?: Feature[]; deletes?: number[] };
type EditResult = { success: boolean; objectId?: number; error?: { code?: number; description?: string } };
export type ServiceEditResult = { id: number; addResults?: EditResult[]; updateResults?: EditResult[]; deleteResults?: EditResult[] };

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
