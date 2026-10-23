import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { passwordError } from '@/lib/auth/accounts';
import { hashPassword } from '@/lib/auth/password';

// Admin actions on one account: deactivate, activate again, or set a new
// temporary password the user must replace at next login. Admin accounts are
// not changed here.
export async function PATCH(request: Request, props: { params: Promise<{ id: string }> }) {
  const admin = await getApiUser('admin');
  if (!admin) return unauthorized();
  const { id } = await props.params;
  const body = (await request.json().catch(() => null)) ?? {};

  const user = await dataStore.user.findUnique({ where: { id } });
  if (!user || user.role === 'admin') return NextResponse.json({ error: 'Хэрэглэгч олдсонгүй.' }, { status: 404 });

  try {
    switch (body.action) {
      case 'deactivate':
        await dataStore.user.update({ where: { id }, data: { isActive: false } });
        return NextResponse.json({ success: true });
      case 'activate':
        await dataStore.user.update({ where: { id }, data: { isActive: true } });
        return NextResponse.json({ success: true });
      case 'reset-password': {
        const error = passwordError(body.password);
        if (error) return NextResponse.json({ error }, { status: 400 });
        await dataStore.user.update({
          where: { id },
          data: { password: hashPassword(body.password), mustChangePassword: true },
        });
        return NextResponse.json({ success: true });
      }
      default:
        return NextResponse.json({ error: 'Үйлдэл буруу байна.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[admin/users] update failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа.' }, { status: 500 });
  }
}
