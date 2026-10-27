import jwt from 'jsonwebtoken';

// Session token helpers with no database or Next.js request access, so the
// proxy can use them as well as server components and API routes.

export const SESSION_COOKIE = 'tailan_session';
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export type Role = 'admin' | 'sender' | 'review_manager' | 'evaluator';

// How the UI addresses each role: the manager uses the "reviewer" portal and
// evaluation staff use the "staff" one.
export type ViewerRole = 'sender' | 'reviewer' | 'staff' | 'admin';

export const VIEWER_ROLE: Record<Role, ViewerRole> = {
  admin: 'admin',
  sender: 'sender',
  review_manager: 'reviewer',
  evaluator: 'staff',
};

// Landing page for each role after a successful login.
export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  sender: '/sender',
  review_manager: '/reviewer',
  evaluator: '/evaluator',
};

// Login portal for each role. The manager and staff share one portal.
// Where a sender of a company the admin has not approved yet (or rejected)
// lands: the registration status, reviewers' comments and the conclusion fix.
export const REGISTRATION_PATH = '/registration';

export const LOGIN_PATH: Record<Role, string> = {
  admin: '/login/admin',
  sender: '/login/sender',
  review_manager: '/login/reviewer',
  evaluator: '/login/reviewer',
};

export type SessionPayload = {
  userId: string;
  role: Role;
  companyId?: string;
  companyType?: string;
};

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

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_HOME;
}

export function createToken(payload: SessionPayload) {
  return jwt.sign(payload, sessionSecret(), { expiresIn: '8h', audience: 'tailan-session' });
}

export function verifyToken(token: string) {
  try {
    const payload = jwt.verify(token, sessionSecret(), { audience: 'tailan-session' });
    if (typeof payload === 'string' || typeof payload.userId !== 'string' || !payload.userId || !isRole(payload.role)) return null;
    return payload as SessionPayload;
  } catch {
    return null;
  }
}
