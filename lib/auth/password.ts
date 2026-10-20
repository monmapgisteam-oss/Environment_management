import { hashPin, verifyPin } from './signature';

export function hashPassword(password: string) {
  return `scrypt:${hashPin(password)}`;
}

export function verifyPassword(password: unknown, stored: string) {
  return typeof password === 'string' && stored.startsWith('scrypt:') && verifyPin(password, stored.slice(7));
}
