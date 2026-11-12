import { hkdfSync } from 'node:crypto';

// One signing key per purpose, derived from JWT_SECRET (HKDF-SHA256). A token
// made for one purpose (a file link, an undo action) can never be accepted as
// another (a session), even if the audience check were ever dropped, and a
// leaked key of one purpose does not give the others.
export type KeyPurpose = 'session' | 'attachment' | 'undo';

export function signingKey(purpose: KeyPurpose): Buffer {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required.');
  return Buffer.from(hkdfSync('sha256', secret, 'tailan-signing-keys', `tailan:${purpose}:v1`, 32));
}
