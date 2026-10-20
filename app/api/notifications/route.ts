import dataStore from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { syncSurveyReportsForManagerNotifications } from '@/lib/survey/reports';

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const ids: string[] = body.ids || (body.id ? [body.id] : []);
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Missing id or ids' }, { status: 400 });
    }
    await dataStore.notification.updateMany({
      where: { id: { in: ids } },
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

    if (user.role === 'review_manager') {
      try {
        await syncSurveyReportsForManagerNotifications();
      } catch (error) {
        console.error('Failed to sync Survey123 notifications', error);
      }
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
