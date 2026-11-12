import { createHash } from 'node:crypto';
import { requestContext } from '@/http/next';
import { clientIp } from '@/lib/auth/rateLimit';

// Security audit trail: one JSON line per event on stdout ({"type":"security"}),
// next to the request log, for a log collector or SIEM to keep and alert on.
// Events name who acted (user id), from where (client address) and on what;
// never passwords, PINs, tokens or file contents. Emails are logged hashed, so
// repeated attempts on one account can be correlated without storing it.

export type SecurityEvent =
  | 'login.success' | 'login.failure' | 'login.blocked'
  | 'logout' | 'logout.everywhere'
  | 'password.changed' | 'signup.created'
  | 'user.created' | 'user.updated'
  | 'company.approved' | 'company.rejected'
  | 'scores.approved'
  | 'pin.failure' | 'pin.blocked'
  | 'upload.blocked' | 'request.cross_site' | 'access.denied';

export function hashedEmail(email: string) {
  return createHash('sha256').update(`audit:${email.trim().toLowerCase()}`).digest('hex').slice(0, 16);
}

export function securityEvent(event: SecurityEvent, details: Record<string, unknown> = {}) {
  const request = requestContext.getStore()?.request;
  const line = {
    type: 'security',
    time: new Date().toISOString(),
    event,
    ip: request ? clientIp(request) : undefined,
    path: request ? new URL(request.url).pathname : undefined,
    ...details,
  };
  process.stdout.write(`${JSON.stringify(line)}\n`);
}
