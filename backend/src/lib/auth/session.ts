import jwt from 'jsonwebtoken';
import { isRole, SESSION_ABSOLUTE_MAX_SECONDS, SESSION_MAX_AGE_SECONDS, SESSION_RENEW_AFTER_SECONDS, type SessionPayload } from '@shared/auth/roles';

// Session token helpers with no database or request access.

export * from '@shared/auth/roles';

function sessionSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required.');
  return process.env.JWT_SECRET;
}

// Cookie settings shared by login and sign-up.
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    // Only over HTTPS outside local development.
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function createToken(payload: SessionPayload) {
  const at = payload.at ?? Math.floor(Date.now() / 1000);
  return jwt.sign({ ...payload, at }, sessionSecret(), { expiresIn: '8h', audience: 'tailan-session' });
}

// Seconds since the password was entered for this session.
function sessionAge(payload: { at?: unknown; iat?: unknown }) {
  const at = typeof payload.at === 'number' ? payload.at : typeof payload.iat === 'number' ? payload.iat : 0;
  return Date.now() / 1000 - at;
}

export function renewedToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, sessionSecret(), { audience: 'tailan-session', algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.iat !== 'number') return null;
    if (Date.now() / 1000 - payload.iat < SESSION_RENEW_AFTER_SECONDS) return null;
    if (typeof payload.userId !== 'string' || !isRole(payload.role)) return null;
    if (sessionAge(payload) >= SESSION_ABSOLUTE_MAX_SECONDS) return null;
    const { userId, role, companyId, companyType, pv, at } = payload as SessionPayload;
    return createToken({ userId, role, companyId, companyType, pv, at: at ?? payload.iat });
  } catch {
    return null;
  }
}

export function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, sessionSecret(), { audience: 'tailan-session', algorithms: ['HS256'] });
    if (typeof payload === 'string' || typeof payload.userId !== 'string' || !payload.userId || !isRole(payload.role)) return null;
    if (sessionAge(payload) >= SESSION_ABSOLUTE_MAX_SECONDS) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
