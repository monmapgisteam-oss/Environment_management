import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { ACTIVE_USER_WHERE } from '@/lib/auth/accounts';
import { audienceRoles, parseBroadcast } from '@/lib/notifications/broadcast';
import type { Role } from '@/lib/auth/session';

const BATCH = 200;

// The admin sends one message to every active user of the chosen group. Each
// recipient gets it as a notification (the bell in the header), tagged with
// the broadcast so it reads as a system message.
export async function POST(request: Request) {
  const admin = await getApiUser('admin');
  if (!admin) return unauthorized();

  const parsed = parseBroadcast((await request.json().catch(() => null)) ?? {});
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { title, message, audience } = parsed.input;

  try {
    const recipients = await dataStore.user.findMany({
      where: { role: { in: audienceRoles(audience) as Role[] }, ...ACTIVE_USER_WHERE },
      select: { id: true },
    });
    if (recipients.length === 0) {
      return NextResponse.json({ error: 'Сонгосон бүлэгт идэвхтэй хэрэглэгч алга.' }, { status: 400 });
    }

    const broadcast = await dataStore.broadcast.create({
      data: { title, message, audience, sentByUserId: admin.id, sentByName: admin.name, recipientCount: recipients.length },
    });
    for (let start = 0; start < recipients.length; start += BATCH) {
      await dataStore.notification.createMany({
        data: recipients.slice(start, start + BATCH).map((user) => ({ userId: user.id, broadcastId: broadcast.id, title, message })),
      });
    }
    return NextResponse.json({ success: true, recipientCount: recipients.length }, { status: 201 });
  } catch (error) {
    console.error('[admin/broadcasts] failed:', error);
    return NextResponse.json({ error: 'Мэдэгдэл илгээхэд алдаа гарлаа.' }, { status: 500 });
  }
}
