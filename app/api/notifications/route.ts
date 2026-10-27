import dataStore from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    const body = await request.json().catch(() => ({}));
    const raw: unknown[] = Array.isArray(body.ids) ? body.ids : body.id ? [body.id] : [];
    const ids = raw.filter((id): id is string => typeof id === 'string').slice(0, 200);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }
    // Scoped to the caller: ids of other users' notifications are ignored.
    await dataStore.notification.updateMany({
      where: { id: { in: ids }, userId: user.id },
      data: { isRead: true },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }
}

export async function GET() {
  try {
    // Notifications belong to the logged-in user only — a manager must not see
    // a staff member's "Танд тайлан оноогдлоо" and vice versa.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ notifications: [], unreadCount: 0 });
    }

    const notifications = await dataStore.notification.findMany({
      where: { userId: user.id },
      include: { report: true },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const unreadCount = await dataStore.notification.count({
      where: { userId: user.id, isRead: false },
    });

    return NextResponse.json({ notifications, unreadCount });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ notifications: [], unreadCount: 0 });
  }
}
