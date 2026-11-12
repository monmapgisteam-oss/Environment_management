import { createHash } from 'node:crypto';
import { applyEdits, layerInfo, queryFeatures, sqlString, storedFieldName } from '@/lib/db/arcgis';
import { SESSION_ABSOLUTE_MAX_SECONDS, type SessionPayload } from '@shared/auth/roles';

// Server-side sign-out. A session token stays valid until it expires, so
// logging out records the session as ended:
// - "session:<sid>" ends one browser's session (logout);
// - "user:<id>" ends every session issued to the user before a moment
//   (sign out everywhere).
// Both live in the tailan_rateLimit dataset (key, count, resetAt), so no new
// table is needed; resetAt holds when the record may be forgotten (session
// records) or the cut-off time (user records). Keys are stored hashed.
//
// Lookups are cached for a minute; this backend's own sign-outs update the
// cache at once (one backend instance per deployment, see keyedLock.ts).

const CACHE_MS = 60_000;
const cache = new Map<string, { value: number; checkedAt: number }>();

function hashed(key: string) {
  return createHash('sha256').update(`revocation:${key}`).digest('hex');
}

async function read(key: string): Promise<number> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.checkedAt < CACHE_MS) return hit.value;
  const layer = await layerInfo('tailan_rateLimit');
  const name = (field: string) => storedFieldName(layer, field);
  const [stored] = await queryFeatures(layer, `${name('key')} = ${sqlString(hashed(key))}`);
  const value = stored ? Number(stored.attributes[name('resetAt')]) || 0 : 0;
  if (cache.size > 10_000) cache.clear();
  cache.set(key, { value, checkedAt: Date.now() });
  return value;
}

async function write(key: string, value: number) {
  const layer = await layerInfo('tailan_rateLimit');
  const name = (field: string) => storedFieldName(layer, field);
  const [stored] = await queryFeatures(layer, `${name('key')} = ${sqlString(hashed(key))}`);
  const attributes = { [name('key')]: hashed(key), [name('count')]: 1, [name('resetAt')]: value };
  await applyEdits([stored
    ? { id: layer.id, updates: [{ attributes: { ...attributes, [layer.objectIdField]: stored.attributes[layer.objectIdField] } }] }
    : { id: layer.id, adds: [{ attributes }] }]);
  cache.set(key, { value, checkedAt: Date.now() });
}

// Ends one session. The record is kept until the token could no longer be
// valid anyway.
export async function revokeSession(payload: SessionPayload & { iat?: number }) {
  if (!payload.sid) return;
  const signedInAt = (payload.at ?? payload.iat ?? Math.floor(Date.now() / 1000)) * 1000;
  await write(`session:${payload.sid}`, signedInAt + SESSION_ABSOLUTE_MAX_SECONDS * 1000);
}

// Ends every session of the user that exists now.
export async function revokeAllSessions(userId: string) {
  await write(`user:${userId}`, Date.now());
}

export async function isSessionRevoked(payload: SessionPayload & { iat?: number }): Promise<boolean> {
  const [sessionUntil, userCutoff] = await Promise.all([
    payload.sid ? read(`session:${payload.sid}`) : Promise.resolve(0),
    read(`user:${payload.userId}`),
  ]);
  if (sessionUntil > Date.now()) return true;
  // Sessions renewed after the cut-off still carry their sign-in time.
  const signedInAt = (payload.at ?? payload.iat ?? 0) * 1000;
  return userCutoff > 0 && signedInAt <= userCutoff;
}
