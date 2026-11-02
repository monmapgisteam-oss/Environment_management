import { createHash } from 'crypto';
import { hashPin, verifyPin } from './signature';

export function hashPassword(password: string) {
  return `scrypt:${hashPin(password)}`;
}

export function verifyPassword(password: unknown, stored: string) {
  return typeof password === 'string' && stored.startsWith('scrypt:') && verifyPin(password, stored.slice(7));
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
const DUMMY_HASH = hashPassword('timing-equaliser');
export function verifyDummyPassword(password: unknown) {
  verifyPassword(typeof password === 'string' ? password : '', DUMMY_HASH);
  return false;
}
