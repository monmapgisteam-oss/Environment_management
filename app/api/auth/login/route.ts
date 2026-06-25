import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createToken } from '@/lib/auth';

export async function POST(request: Request) {
  const { email, password, expectedRole } = await request.json();
  const user = await prisma.user.findUnique({
    where: { email },
    include: { company: true },
  });

  if (!user || user.password !== password) {
    return NextResponse.json({ error: 'Имэйл эсвэл нууц үг буруу.' }, { status: 401 });
  }

  if (expectedRole === 'sender' && user.role !== 'sender') {
    return NextResponse.json({ error: 'Та зөв нэвтрэх эрхтэй хэрэглэгч биш байна.' }, { status: 403 });
  }

  if (expectedRole === 'review_manager' && user.role !== 'review_manager') {
    return NextResponse.json({ error: 'Та зөв нэвтрэх эрхтэй хэрэглэгч биш байна.' }, { status: 403 });
  }

  if (expectedRole === 'admin' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Та зөв нэвтрэх эрхтэй хэрэглэгч биш байна.' }, { status: 403 });
  }

  const token = createToken({
    userId: user.id,
    role: user.role,
    companyId: user.companyId || undefined,
    companyType: user.company?.type || undefined,
  });

  const response = NextResponse.json({ success: true });
  response.cookies.set('tailan_session', token, {
    httpOnly: true,
    path: '/',
    maxAge: 8 * 60 * 60,
  });
  return response;
}
