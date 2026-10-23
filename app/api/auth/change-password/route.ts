import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { parseNewPassword } from '@/lib/auth/accounts';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { clientIp, rateLimit } from '@/lib/auth/rateLimit';

// Replaces the signed-in user's password. After an admin set a temporary
// password the user picks their own without retyping the old one; otherwise
// the current password is required.
export async function POST(request: Request) {
  const user = await getCurrentUser({ allowPendingPassword: true });
  if (!user) return NextResponse.json({ error: 'Нэвтрээгүй байна.' }, { status: 401 });
  if (!rateLimit(`change-password:${user.id}:${clientIp(request)}`, 10, 15 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' }, { status: 429 });
  }

  const body = (await request.json().catch(() => null)) ?? {};
  if (!user.mustChangePassword && !verifyPassword(body.currentPassword, user.password)) {
    return NextResponse.json({ error: 'Одоогийн нууц үг буруу байна.' }, { status: 400 });
  }
  const parsed = parseNewPassword(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (verifyPassword(parsed.password, user.password)) {
    return NextResponse.json({ error: 'Шинэ нууц үг өмнөхөөсөө өөр байх ёстой.' }, { status: 400 });
  }

  await dataStore.user.update({
    where: { id: user.id },
    data: { password: hashPassword(parsed.password), mustChangePassword: false },
  });
  return NextResponse.json({ success: true });
}
