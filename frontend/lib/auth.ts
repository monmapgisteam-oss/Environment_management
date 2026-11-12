import { cache } from 'react';
import { redirect } from 'next/navigation';
import { backendFetch } from '@/lib/api/server';
import { decodeView } from '@shared/views/encoding';
import type { MeResponse, PublicUser } from '@shared/views';
import { LOGIN_PATH, REGISTRATION_PATH, ROLE_HOME, type Role } from '@shared/auth/roles';

export * from '@shared/auth/roles';

export type CurrentUser = PublicUser;

// Who is signed in, asked once per page render (layouts and pages share it).
export const getMe = cache(async (): Promise<MeResponse> => {
  const response = await backendFetch('/api/auth/me');
  if (!response.ok) throw new Error(`Session lookup failed (HTTP ${response.status}).`);
  return decodeView<MeResponse>(await response.text());
});

// The signed-in user of an approved company (or any other role). Someone who
// still has to replace a temporary password counts; the page frame shows the
// change-password dialog over the page.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const me = await getMe();
  return me.approved ? me.user : null;
}

// For pages and layouts: returns the signed-in user, or redirects to the login
// portal of the first allowed role. With no roles, any signed-in user passes.
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const me = await getMe();
  // An unapproved company's sender only has the registration page.
  if (me.user && !me.approved && me.user.role === 'sender') redirect(REGISTRATION_PATH);
  const user = me.approved ? me.user : null;
  if (!user || (roles.length > 0 && !roles.includes(user.role))) {
    redirect(roles.length > 0 ? LOGIN_PATH[roles[0]] : '/');
  }
  return user;
}

// The registration page: a sender whose company still waits for the admin or
// was rejected. Approved senders go to their portal, anyone else to login.
export async function requireRegistrationUser(): Promise<CurrentUser> {
  const me = await getMe();
  if (!me.user || me.user.role !== 'sender') redirect(LOGIN_PATH.sender);
  if (me.approved) redirect('/sender');
  return me.user;
}

// For login pages: who is already signed in on this browser, and their portal.
// Optional: an outage leaves the login page working without the banner.
export async function signedInSummary(): Promise<{ name: string; home: string } | null> {
  try {
    const me = await getMe();
    return me.approved && me.user ? { name: me.user.name, home: ROLE_HOME[me.user.role] } : null;
  } catch (error) {
    console.error('[auth] signed-in summary unavailable:', error);
    return null;
  }
}
