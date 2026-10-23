import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { parseStaffAccount } from '@/lib/auth/accounts';
import { hashPassword } from '@/lib/auth/password';

// The admin creates an account for the review organisation (staff member or
// manager) with a temporary password; the user replaces it at first login.
export async function POST(request: Request) {
  const admin = await getApiUser('admin');
  if (!admin) return unauthorized();

  const parsed = parseStaffAccount((await request.json().catch(() => null)) ?? {});
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { input } = parsed;

  try {
    if (await dataStore.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      return NextResponse.json({ error: 'Энэ имэйл хаягаар бүртгэл үүссэн байна.' }, { status: 409 });
    }
    const company = await dataStore.company.findFirst({ where: { type: 'reviewer' } });
    if (!company) return NextResponse.json({ error: 'Хянах байгууллага бүртгэгдээгүй байна.' }, { status: 400 });

    const user = await dataStore.user.create({
      data: {
        name: input.name,
        email: input.email,
        password: hashPassword(input.password),
        role: input.role,
        companyId: company.id,
        position: input.position ?? (input.role === 'evaluator' ? 'Үнэлгээний гишүүн' : 'Хянах менежер'),
        phone: input.phone,
        isActive: true,
        mustChangePassword: true,
      },
    });
    return NextResponse.json({ success: true, id: user.id }, { status: 201 });
  } catch (error) {
    console.error('[admin/users] create failed:', error);
    return NextResponse.json({ error: 'Бүртгэл үүсгэхэд алдаа гарлаа.' }, { status: 500 });
  }
}
