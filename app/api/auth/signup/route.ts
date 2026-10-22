import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { hashPassword } from '@/lib/auth/password';
import { clientIp, rateLimit } from '@/lib/auth/rateLimit';
import { createToken, ROLE_HOME, SESSION_COOKIE, sessionCookieOptions } from '@/lib/auth/session';
import { parseSignup } from '@/lib/auth/signup';
import { findSenderCompanyByRegister } from '@/lib/reports/companies';

// A sender company registers itself: one company record plus its first user,
// then it is signed in. A register number already in the system cannot be
// claimed again; the admin adds further users to an existing company.
export async function POST(request: Request) {
  if (!rateLimit(`signup:ip:${clientIp(request)}`, 10, 60 * 60 * 1000).ok) {
    return NextResponse.json({ error: 'Хэт олон оролдлого. Түр хүлээгээд дахин оролдоно уу.' }, { status: 429 });
  }
  const body = await request.json().catch(() => null);
  const parsed = parseSignup(body ?? {});
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { input } = parsed;

  try {
    if (await dataStore.user.findUnique({ where: { email: input.email }, select: { id: true } })) {
      return NextResponse.json({ error: 'Энэ имэйл хаягаар бүртгэл үүссэн байна. Нэвтэрнэ үү.' }, { status: 409 });
    }
    if (await findSenderCompanyByRegister(input.registerNumber)) {
      return NextResponse.json(
        { error: 'Энэ регистрийн дугаартай байгууллага бүртгэлтэй байна. Нэвтрэх эрх авахын тулд системийн админд хандана уу.' },
        { status: 409 },
      );
    }

    const company = await dataStore.company.create({
      data: { name: input.companyName, registerNumber: input.registerNumber, type: 'sender' },
    });
    const user = await dataStore.user.create({
      data: {
        name: input.contactName,
        email: input.email,
        password: hashPassword(input.password),
        role: 'sender',
        companyId: company.id,
        phone: input.phone ?? input.companyPhone,
        position: input.position ?? 'Тайлан хариуцсан мэргэжилтэн',
      },
    });

    const token = createToken({ userId: user.id, role: 'sender', companyId: company.id, companyType: 'sender' });
    const response = NextResponse.json({ success: true, redirect: ROLE_HOME.sender }, { status: 201 });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    return response;
  } catch (error) {
    console.error('[auth/signup] failed:', error);
    return NextResponse.json({ error: 'Бүртгэл үүсгэхэд алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
