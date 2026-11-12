// Roles, portals and session constants shared by the frontend and backend.
// No secrets or token handling here: tokens are made and checked only by the
// backend (backend/src/lib/auth/session.ts).

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
  // Fingerprint of the password the session was issued for (lib/auth/password).
  pv?: string;
};

// Sliding session: a token older than this is reissued (same user, role and
// password version) on the next page or API request, so someone who keeps
// working stays signed in; 8 hours without any request still signs them out.
export const SESSION_RENEW_AFTER_SECONDS = 30 * 60;

export function isRole(value: unknown): value is Role {
  return typeof value === 'string' && value in ROLE_HOME;
}
