import prisma from '@/lib/prisma';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }
    await prisma.notification.updateMany({
      where: { id: { in: ids } },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyType = searchParams.get('companyType') || 'sender';

    const users = await prisma.user.findMany({
      where: {
        company: { type: companyType as any },
      },
      select: { id: true },
    });

    const userIds = users.map((u) => u.id);

    const notifications = await prisma.notification.findMany({
      where: {
        userId: { in: userIds },
      },
      include: { report: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await prisma.notification.count({
      where: {
        userId: { in: userIds },
        isRead: false,
      },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
