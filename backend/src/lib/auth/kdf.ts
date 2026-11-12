import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto';

// Password and PIN hashing: scrypt with the OWASP-recommended cost
// (N=2^15, r=8, p=3; 32 MiB per hash), run off the event loop. Stored as
// "s2$N$r$p$salt$hash" so the cost can be raised later without breaking old
// hashes. The first format ("salt:hash", Node defaults N=2^14, p=1) still
// verifies and is reported as outdated, so callers can rehash it.

const COST = { N: 2 ** 15, r: 8, p: 3 };
const KEY_LENGTH = 64;
const MAX_MEMORY = 64 * 1024 * 1024;

function derive(secret: string, salt: string, options: ScryptOptions) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(secret, salt, KEY_LENGTH, { ...options, maxmem: MAX_MEMORY }, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

export async function deriveHash(secret: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(secret, salt, COST);
  return `s2$${COST.N}$${COST.r}$${COST.p}$${salt}$${key.toString('hex')}`;
}

function sameKey(candidate: Buffer, expectedHex: string) {
  const expected = Buffer.from(expectedHex, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export async function verifyHash(secret: string, stored: string): Promise<{ ok: boolean; outdated: boolean }> {
  if (stored.startsWith('s2$')) {
    const [, n, r, p, salt, hash] = stored.split('$');
    const cost = { N: Number(n), r: Number(r), p: Number(p) };
    if (!salt || !hash || !Number.isInteger(cost.N) || !Number.isInteger(cost.r) || !Number.isInteger(cost.p)) {
      return { ok: false, outdated: false };
    }
    const ok = sameKey(await derive(secret, salt, cost), hash);
    return { ok, outdated: ok && (cost.N < COST.N || cost.r < COST.r || cost.p < COST.p) };
  }
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return { ok: false, outdated: false };
  const ok = sameKey(await derive(secret, salt, { N: 2 ** 14, r: 8, p: 1 }), hash);
  return { ok, outdated: ok };
}
