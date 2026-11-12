import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parseNewPassword } from '@shared/auth/accounts';
import { hashPassword, passwordVersion, verifyPassword } from '@/lib/auth/password';
import { createToken, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { limitRequest } from '@/lib/auth/rateLimit';
import { securityEvent } from '@/lib/securityLog';

// Replaces the signed-in user's password. After an admin set a temporary
// password the user picks their own without retyping the old one; otherwise
// the current password is required.
export async function POST(request: Request) {
  const user = await getCurrentUser({ allowPendingPassword: true });
  if (!user) return NextResponse.json({ error: 'Нэвтрээгүй байна.' }, { status: 401 });
  if (!(await limitRequest(`change-password:${user.id}`, 10, 15 * 60 * 1000)).ok) {
    return NextResponse.json({ error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  if (!user.mustChangePassword && !(await verifyPassword(body.currentPassword, user.password))) {
    return NextResponse.json({ error: 'Одоогийн нууц үг буруу байна.' }, { status: 400 });
  }
  const parsed = parseNewPassword(body, user.email);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (await verifyPassword(parsed.password, user.password)) {
    return NextResponse.json({ error: 'Шинэ нууц үг өмнөхөөсөө өөр байх ёстой.' }, { status: 400 });
  }

  const password = await hashPassword(parsed.password);
  await dataStore.user.update({
    where: { id: user.id },
    data: { password, mustChangePassword: false },
  });
  securityEvent('password.changed', { userId: user.id });
  // Every other session of this account ends with the old password; this one
  // gets a fresh token so the user stays signed in.
  const response = NextResponse.json({ success: true });
  response.cookies.set(
    SESSION_COOKIE,
    createToken({
      userId: user.id,
      role: user.role,
      companyId: user.companyId || undefined,
      companyType: user.company?.type || undefined,
      pv: passwordVersion(password),
    }),
    sessionCookieOptions(),
  );
  return response;
}
