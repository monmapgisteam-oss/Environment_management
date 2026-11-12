// Roles, portals and session constants shared by the frontend and backend.
// No secrets or token handling here: tokens are made and checked only by the
// backend (backend/src/lib/auth/session.ts).

// In production the "__Host-" prefix makes browsers accept the cookie only
// from this exact host over HTTPS with Path=/, so a sibling subdomain cannot
// plant its own session cookie. Plain HTTP development keeps the bare name.
export const SESSION_COOKIE = process.env.NODE_ENV === 'production' ? '__Host-tailan_session' : 'tailan_session';
// A session ends after two hours without any page or API request.
export const SESSION_MAX_AGE_SECONDS = 2 * 60 * 60;
// However often a session is renewed, it ends this long after the password was
// entered; the user then signs in again.
export const SESSION_ABSOLUTE_MAX_SECONDS = 12 * 60 * 60;

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
  // Fingerprint of the password the session was issued for (lib/auth/password).
  pv?: string;
  // When the user entered the password (seconds); kept through renewals.
  at?: number;
  // Random id of this sign-in, kept through renewals; logout ends it.
  sid?: string;
};

// Sliding session: a token older than this is reissued (same user, role and
// password version) on the next page or API request, so someone who keeps
// working stays signed in; two hours without any request signs them out.
export const SESSION_RENEW_AFTER_SECONDS = 10 * 60;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_HOME;
}
