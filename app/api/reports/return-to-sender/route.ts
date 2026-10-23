import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotifications, createUndoToken, returnFields } from '@/lib/reports/undo';
import { loadReportSections } from '@/lib/reports/reportSections';
import { cleanRevisionItems, serializeRevisionItems } from '@/lib/reports/revisions';

// The manager returns a report to the sender company for revision. This is the
// final return step: the sender sees status "Засвар шаардсан" with the reason.
// A manager may return any report (whether or not staff requested it first).
export async function POST(request: Request) {
  try {
    const { reportId, reason, items } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'review_manager') {
      return NextResponse.json({ error: 'Зөвхөн хянах менежер тайлан буцаана.' }, { status: 403 });
    }

    const before = await dataStore.report.findUnique({ where: { id: reportId }, include: { reportType: true } });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    // The sections the sender must fix, each with the manager's comment.
    const revisionItems = cleanRevisionItems(items, await loadReportSections(before));
    const reasonText = typeof reason === 'string' ? reason.trim() : '';
    if (!reasonText && revisionItems.length === 0) {
      return NextResponse.json({ error: 'Засах хэсгээ сонгож тайлбар бичнэ үү.' }, { status: 400 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: 'needs_revision',
        returnReason: reasonText || null,
        returnRequestedBy: null,
        revisionItems: serializeRevisionItems(revisionItems),
      },
      include: { senderCompany: { include: { users: true } } },
    });

    // Notify the sender company so they can revise and resubmit.
    const notificationIds = await createNotifications(
      report.senderCompany.users.map((u) => ({
        userId: u.id,
        reportId,
        title: 'Тайлан буцаагдлаа',
        message: `"${report.reportNumber}" тайлан засвар шаардсан байна.${
          revisionItems.length ? ` Засах хэсэг: ${revisionItems.length}.` : ''
        }${report.returnReason ? ` Шалтгаан: ${report.returnReason}` : ''}`,
      })),
    );

    const undoToken = createUndoToken(
      { kind: 'return-to-sender', reportId, notificationIds, prev: returnFields(before) },
      user.id,
      report.updatedAt,
    );
    return NextResponse.json({ success: true, undoToken }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Тайлан буцаахад алдаа гарлаа.' }, { status: 500 });
  }
}
