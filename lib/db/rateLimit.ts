import { applyEdits, layerInfo, queryFeatures, sqlString, storedFieldName } from './arcgis';
import type { RateLimitResult } from '@/lib/auth/rateLimit';

// Attempt counters for login and sign-up in the tailan_rateLimit dataset, one
// record per key, so the limit holds across restarts and server instances.
// Reading and writing the counter are two requests, so attempts sent at the
// same moment can each count once from the same value.
export async function hit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const layer = await layerInfo('tailan_rateLimit');
  const name = (field: string) => storedFieldName(layer, field);
  const [stored] = await queryFeatures(layer, `${name('key')} = ${sqlString(key)}`);
  const now = Date.now();
  const active = stored && Number(stored.attributes[name('resetAt')]) > now;
  const count = active ? Number(stored.attributes[name('count')]) + 1 : 1;
  const resetAt = active ? Number(stored.attributes[name('resetAt')]) : now + windowMs;
  const attributes = { [name('key')]: key, [name('count')]: count, [name('resetAt')]: resetAt };
  await applyEdits([stored
    ? { id: layer.id, updates: [{ attributes: { ...attributes, [layer.objectIdField]: stored.attributes[layer.objectIdField] } }] }
    : { id: layer.id, adds: [{ attributes }] }]);
  return {
    ok: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds: Math.max(1, Math.ceil((resetAt - now) / 1000)),
  };
}
