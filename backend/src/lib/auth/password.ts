import { createHash } from 'crypto';
import { deriveHash, verifyHash } from './kdf';

export async function hashPassword(password: string) {
  return `scrypt:${await deriveHash(password)}`;
}

// Whether the password matches, and whether its stored hash uses an older,
// weaker format (lib/auth/kdf.ts) that should be replaced now that the
// password is known.
export async function checkPassword(password: unknown, stored: string): Promise<{ ok: boolean; outdated: boolean }> {
  if (typeof password !== 'string' || !stored.startsWith('scrypt:')) return { ok: false, outdated: false };
  return verifyHash(password, stored.slice(7));
}

export async function verifyPassword(password: unknown, stored: string) {
  return (await checkPassword(password, stored)).ok;
}

// Short fingerprint of the stored password hash, carried in the session
// token. Changing or resetting the password changes it, so every session
// issued before the change stops working (a hijacked session can't outlive a
// reset). It reveals nothing about the password.
export function passwordVersion(stored: string) {
  return createHash('sha256').update(`session:${stored}`).digest('hex').slice(0, 16);
}

// Spends the same time as checking a real password, so a login attempt for an
// unknown email can't be told apart by how long it takes.
// Started at load so the first unknown-email attempt takes no longer than later ones.
let dummyHash: Promise<string> | undefined = hashPassword('timing-equaliser');
export async function verifyDummyPassword(password: unknown) {
  dummyHash ??= hashPassword('timing-equaliser');
  await verifyPassword(typeof password === 'string' ? password : '', await dummyHash);
  return false;
}
