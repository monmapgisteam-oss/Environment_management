import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'crypto';

// Signature passwords are issued by the system (admin creates or reissues
// them), never chosen by the signer.
export const SIGNATURE_PIN_LENGTH = 6;

export function generateSignaturePin(): string {
  return Array.from({ length: SIGNATURE_PIN_LENGTH }, () => randomInt(10)).join('');
}

// Numeric-PIN hashing (scrypt, salted). Only the hash is ever persisted —
// the raw PIN never touches the database or an API response.
export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pin, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(pin, salt, 64);
  const expected = Buffer.from(hash, 'hex');
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

// SHA-256 hash of the fixed, signed payload (report/assignment id, staff id,
// every criterion score, total score, timestamp) — a tamper-evident fingerprint
// of exactly what was signed, safe to expose to managers.
export function computeDocumentHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

// SIG-YYYYMMDD-NNNNN, sequence scoped to the calendar day (UTC). A manager's
// approval of a report's scores uses the BAT- prefix.
export function generateSignatureId(sequence: number, at: Date = new Date(), prefix = 'SIG'): string {
  const y = at.getUTCFullYear();
  const m = String(at.getUTCMonth() + 1).padStart(2, '0');
  const d = String(at.getUTCDate()).padStart(2, '0');
  const seq = String(sequence).padStart(5, '0');
  return `${prefix}-${y}${m}${d}-${seq}`;
}
