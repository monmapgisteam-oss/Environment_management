import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createNotifications, createUndoToken, returnFields } from '@/lib/reports/undo';
import { loadReportSections } from '@/lib/reports/reportSections';
import { cleanRevisionItems, serializeRevisionItems } from '@/lib/reports/revisions';

// A staff member (evaluator) who finds an assigned report incomplete asks the
// manager to return it to the sender. This does NOT go to the sender directly —
// it flags the report (status: return_requested) and notifies the manager(s),
// who then decide whether to actually return it.
export async function POST(request: Request) {
  try {
    const { reportId, reason, items } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'evaluator') {
      return NextResponse.json({ error: 'Зөвхөн үнэлгээний ажилтан буцаах хүсэлт илгээнэ.' }, { status: 403 });
    }

    // Staff can only flag a report that was actually assigned to them.
    const assignment = await dataStore.reportAssignment.findFirst({
      where: { reportId, evaluatorUserId: user.id },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Танд энэ тайлан оноогдоогүй байна.' }, { status: 403 });
    }

    const before = await dataStore.report.findUnique({ where: { id: reportId }, include: { reportType: true } });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    // Sections the staff member flagged, each with its own comment.
    const revisionItems = cleanRevisionItems(items, await loadReportSections(before));
    const reasonText = typeof reason === 'string' ? reason.trim() : '';
    if (!reasonText && revisionItems.length === 0) {
      return NextResponse.json({ error: 'Засах хэсгээ сонгож тайлбар бичнэ үү.' }, { status: 400 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: 'return_requested',
        returnReason: reasonText || null,
        returnRequestedBy: user.name,
        revisionItems: serializeRevisionItems(revisionItems),
      },
    });

    // Notify every review manager that a staff member wants this returned.
    const managers = await dataStore.user.findMany({
      where: { role: 'review_manager' },
      select: { id: true },
    });
    const notificationIds = await createNotifications(
      managers.map((manager) => ({
        userId: manager.id,
        reportId,
        title: 'Тайлан буцаах хүсэлт',
        message: `${user.name} "${report.reportNumber}" тайланг дутуу гэж үзэн буцаахыг хүслээ.`,
      })),
    );

    const undoToken = createUndoToken(
      { kind: 'return-request', reportId, notificationIds, prev: returnFields(before) },
      user.id,
      report.updatedAt,
    );
    return NextResponse.json({ success: true, undoToken }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Буцаах хүсэлт илгээхэд алдаа гарлаа.' }, { status: 500 });
  }
}
