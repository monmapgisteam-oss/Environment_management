import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// A logged-in user sends feedback ("Санал хүсэлт") to the system admin(s). The
// message is delivered through the existing notification system, so each admin
// sees it in their notification bell and on /admin/feedback.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Нэвтэрсэн байх шаардлагатай.' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const message: string = (body.message || '').trim();
    if (!message) {
      return NextResponse.json({ error: 'Зурвасаа бичнэ үү.' }, { status: 400 });
    }

    const admins = await prisma.user.findMany({
      where: { role: 'admin' },
      select: { id: true },
    });
    if (admins.length === 0) {
      return NextResponse.json({ error: 'Системийн админ олдсонгүй.' }, { status: 404 });
    }

    const companyName = user.company?.name ? ` (${user.company.name})` : '';
    const title = 'Санал хүсэлт';
    const fullMessage = `${user.name}${companyName}: ${message}`;

    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        title,
        message: fullMessage,
      })),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Илгээхэд алдаа гарлаа.' }, { status: 500 });
  }
}
