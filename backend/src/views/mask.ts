import { scoresReleased, senderStatus } from '@shared/reports/scoreRelease';

// Fields no view ever returns, at any depth: password hashes and signature PIN
// hashes of any user record a view happens to include, and stored signatures.
const SECRET_KEYS = new Set(['password', 'signaturePinHash', 'signature']);

export function stripSecrets<T>(value: T): T {
  if (Array.isArray(value)) return value.map(stripSecrets) as T;
  if (value instanceof Date || !value || typeof value !== 'object') return value;
  const result: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!SECRET_KEYS.has(key)) result[key] = stripSecrets(item);
  }
  return result as T;
}

// A report as its sender may see it, the same as GET /api/reports/:id: no
// score and no "completed" status until the manager has signed the scores off.
export function forSender<T extends { status: string; finalScore: number | null; scoresApprovedAt?: Date | null; signedScanUrl?: string | null }>(report: T): T {
  if (scoresReleased(report)) return report;
  return { ...report, status: senderStatus(report), finalScore: null };
}
