import dataStore from '@/lib/arcgis/data';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

// The manager returns a report to the sender company for revision. This is the
// final return step: the sender sees status "Засвар шаардсан" with the reason.
// A manager may return any report (whether or not staff requested it first).
export async function POST(request: Request) {
  try {
    const { reportId, reason } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'review_manager') {
      return NextResponse.json({ error: 'Зөвхөн хянах менежер тайлан буцаана.' }, { status: 403 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: 'needs_revision',
        returnReason: reason?.trim() || null,
        returnRequestedBy: null,
      },
      include: { senderCompany: { include: { users: true } } },
    });

    // Notify the sender company so they can revise and resubmit.
    const senderUsers = report.senderCompany.users;
    if (senderUsers.length > 0) {
      await dataStore.notification.createMany({
        data: senderUsers.map((u) => ({
          userId: u.id,
          reportId,
          title: 'Тайлан буцаагдлаа',
          message: `"${report.reportNumber}" тайлан засвар шаардсан байна.${report.returnReason ? ` Шалтгаан: ${report.returnReason}` : ''}`,
        })),
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Тайлан буцаахад алдаа гарлаа.' }, { status: 500 });
  }
}
