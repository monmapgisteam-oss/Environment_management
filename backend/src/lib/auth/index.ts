import { cookies } from '@/http/next';
import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { SESSION_COOKIE, verifyToken, type Role } from './session';
import { isSessionRevoked } from './revocation';
import { isActiveUser, isCompanyApproved } from '@shared/auth/accounts';
import { passwordVersion } from './password';

export * from './session';

// The signed-in user. Someone who still has to replace a temporary password
// counts as signed in only where `allowPendingPassword` is set: pages (which
// then show the change-password dialog) and /api/auth/change-password.
// A sender whose company the admin has not approved counts as signed in only
// where `allowUnapprovedCompany` is set: the registration page and its API.
export async function getCurrentUser({ allowPendingPassword = false, allowUnapprovedCompany = false } = {}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Logged out on the server (logout, "sign out everywhere").
  if (await isSessionRevoked(payload)) return null;
  const user = await dataStore.user.findUnique({
    where: { id: payload.userId },
    include: { company: true },
  });
  // A deactivated account loses its open sessions on the next request, and a
  // changed or reset password ends every session issued before it.
  if (!user || !isActiveUser(user)) return null;
  if (payload.pv !== passwordVersion(user.password)) return null;
  if (user.role === 'sender' && !isCompanyApproved(user.company) && !allowUnapprovedCompany) return null;
  if (user.mustChangePassword && !allowPendingPassword) return null;
  return { ...user, company: user.company };
}

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

// For API routes: returns the signed-in user when their role is allowed, or
// null so the route can answer with `unauthorized()`.
export async function getApiUser(...roles: Role[]): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || (roles.length > 0 && !roles.includes(user.role))) return null;
  return user;
}

// The signed-in user as the frontend may see it: never the password hash or
// the signature PIN hash.
export function publicUser(user: CurrentUser) {
  const { password: _password, signaturePinHash, ...rest } = user;
  return { ...rest, hasSignaturePin: !!signaturePinHash };
}

// For the registration page and its API: a sender whose company still waits
// for the admin or was rejected.
// API counterpart of the registration page check: null unless the caller is such a sender.
export async function getRegistrationApiUser(): Promise<CurrentUser | null> {
  const user = await getCurrentUser({ allowUnapprovedCompany: true });
  if (!user || user.role !== 'sender' || isCompanyApproved(user.company)) return null;
  return user;
}

// The answer when getApiUser found nobody allowed: 401 when the caller is not
// signed in at all (expired, logged out, or replaced in another tab), so the
// browser can send them to login; 403 when they are signed in with a role that
// may not do this.
export async function unauthorized() {
  const signedIn = await getCurrentUser({ allowPendingPassword: true, allowUnapprovedCompany: true });
  if (!signedIn) {
    return NextResponse.json({ error: 'Нэвтрэх хугацаа дууссан байна. Дахин нэвтэрнэ үү.' }, { status: 401 });
  }
  return NextResponse.json(
    { error: 'Та энэ үйлдлийг хийх эрхгүй байна. Өөр хэрэглэгчээр нэвтэрсэн бол хуудсаа дахин ачаална уу.' },
    { status: 403 },
  );
}

// Senders may only open reports of their own company. The company is the one
// stored on the report or the one its implementer register resolves to.
// Evaluators open only reports assigned to them; managers and admins open all.
export async function canAccessReport(
  user: CurrentUser,
  report: { id: string; senderCompanyId: string; implementerRegister?: string | null; title?: string | null },
) {
  if (user.role === 'evaluator') {
    // Conclusions ("Ерөнхий үнэлгээний дүгнэлт") are never assigned; staff read
    // them from the conclusions list, which shows approved companies only, so
    // a pending or rejected company's conclusion stays closed to them.
    if ('title' in report && report.title === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      const company = await dataStore.company.findUnique({ where: { id: report.senderCompanyId } });
      return !!company && isCompanyApproved(company);
    }
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
