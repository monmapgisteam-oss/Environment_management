import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { LOGIN_PATH, SESSION_COOKIE, verifyToken, type Role } from './session';

export * from './session';

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = await dataStore.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });
  return user ? { ...user, company: user.company } : null;
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// For pages and layouts: returns the signed-in user, or redirects to the login
// portal of the first allowed role. With no roles, any signed-in user passes.
export async function requireUser(...roles: Role[]): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || (roles.length > 0 && !roles.includes(user.role))) {
    redirect(roles.length > 0 ? LOGIN_PATH[roles[0]] : '/');
  }
  return user;
}

// For API routes: returns the signed-in user when their role is allowed, or
// null so the route can answer with `unauthorized()`.
export async function getApiUser(...roles: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || (roles.length > 0 && !roles.includes(user.role))) return null;
  return user;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Та энэ үйлдлийг хийх эрхгүй байна.' }, { status: 403 });
}

// Senders may only open reports of their own company. The company is the one
// stored on the report or the one its implementer register resolves to.
// Evaluators open only reports assigned to them; managers and admins open all.
export async function canAccessReport(
  user: CurrentUser,
  report: { id: string; senderCompanyId: string; implementerRegister?: string | null },
) {
  if (user.role === 'evaluator') {
    const assignment = await dataStore.reportAssignment.findFirst({
      where: { reportId: report.id, evaluatorUserId: user.id },
      select: { id: true },
    });
    return !!assignment;
  }
  if (user.role !== 'sender') return true;
  if (!user.companyId) return false;
  if (report.senderCompanyId === user.companyId) return true;
  const [effective] = await attachEffectiveSenderCompanies([
    { senderCompany: { id: report.senderCompanyId }, implementerRegister: report.implementerRegister },
  ]);
  return effective.senderCompany.id === user.companyId;
}
