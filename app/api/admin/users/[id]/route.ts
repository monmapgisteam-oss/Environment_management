import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { passwordError } from '@/lib/auth/accounts';
import { hashPassword } from '@/lib/auth/password';
import { generateSignaturePin, hashPin } from '@/lib/auth/signature';

// Admin actions on one account: deactivate, activate again, set a new
// temporary password the user must replace at next login, or issue a new
// digital signature password (the old one stops working). Admin accounts are
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
      case 'reset-signature': {
        if (user.role !== 'evaluator' && user.role !== 'review_manager') {
          return NextResponse.json({ error: 'Зөвхөн хянах байгууллагын ажилтанд гарын үсэг олгоно.' }, { status: 400 });
        }
        const signaturePin = generateSignaturePin();
        await dataStore.user.update({ where: { id }, data: { signaturePinHash: hashPin(signaturePin) } });
        // Shown to the admin once; only the hash is stored.
        return NextResponse.json({ success: true, signaturePin });
      }
      default:
        return NextResponse.json({ error: 'Үйлдэл буруу байна.' }, { status: 400 });
    }
  } catch (error) {
    console.error('[admin/users] update failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа.' }, { status: 500 });
  }
}
