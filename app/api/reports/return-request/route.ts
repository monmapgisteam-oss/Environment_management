import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import { createNotifications, createUndoToken, returnFields } from '@/lib/reports/undo';
import { loadReturnSections } from '@/lib/reports/reportSections';
import { cleanRevisionItems, serializeRevisionItems } from '@/lib/reports/revisions';
import { canTransition, transitionError } from '@/lib/reports/transitions';
import { nounForReportType } from '@/lib/reports/terms';
import { NO_SENDER_ACCOUNT_WARNING, senderRecipientIds } from '@/lib/reports/companies';

// An evaluator who finds an assigned report incomplete returns it straight to
// the sender for revision (status: needs_revision), with the sections to fix.
// The managers and the other assigned evaluators are told; no approval step.
export async function POST(request: Request) {
  try {
    const { reportId, reason, items } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getApiUser('evaluator');
    if (!user) return unauthorized();

    // Staff can only flag a report that was actually assigned to them.
    const assignment = await dataStore.reportAssignment.findFirst({
      where: { reportId, evaluatorUserId: user.id },
      include: { evaluation: true },
    });
    if (!assignment) {
      return NextResponse.json({ error: 'Танд энэ тайлан оноогдоогүй байна.' }, { status: 403 });
    }

    const before = await dataStore.report.findUnique({ where: { id: reportId }, include: { reportType: true } });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    // Only while the report is being scored and this evaluator hasn't signed:
    // a signed evaluation can't change, so the report could never finish.
    if (!canTransition(before.status, 'returnRequest') || assignment.evaluation?.status === 'SIGNED') {
      return NextResponse.json({ error: transitionError('returnRequest') }, { status: 409 });
    }
    // Sections the staff member flagged, each with its own comment.
    const revisionItems = cleanRevisionItems(items, await loadReturnSections(before));
    const reasonText = typeof reason === 'string' ? reason.trim() : '';
    if (!reasonText && revisionItems.length === 0) {
      return NextResponse.json({ error: 'Засах хэсгээ сонгож тайлбар бичнэ үү.' }, { status: 400 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: 'needs_revision',
        returnReason: reasonText || null,
        returnRequestedBy: user.name,
        revisionItems: serializeRevisionItems(revisionItems),
      },
    });
    const senderIds = await senderRecipientIds(report);

    const noun = nounForReportType(before.reportType);
    const fixList = `${revisionItems.length ? ` Засах хэсэг: ${revisionItems.length}.` : ''}${reasonText ? ` Шалтгаан: ${reasonText}` : ''}`;
    // The sender fixes it; managers and the other evaluators learn it went back.
    const [managers, others] = await Promise.all([
      dataStore.user.findMany({ where: { role: 'review_manager' }, select: { id: true } }),
      dataStore.reportAssignment.findMany({ where: { reportId, evaluatorUserId: { not: user.id } }, select: { evaluatorUserId: true } }),
    ]);
    const notificationIds = await createNotifications([
      ...senderIds.map((userId) => ({
        userId,
        reportId,
        title: `${noun.one === 'БОМТ' ? 'БОМТ' : 'Тайлан'} буцаагдлаа`,
        message: `"${report.reportNumber}" ${noun.one} засвар шаардсан байна.${fixList}`,
      })),
      ...[...managers.map((m) => m.id), ...new Set(others.map((a) => a.evaluatorUserId))].map((userId) => ({
        userId,
        reportId,
        title: 'Тайлан илгээгчид буцаагдлаа',
        message: `${user.name} "${report.reportNumber}" ${noun.one === 'БОМТ' ? 'БОМТ-г' : 'тайланг'} илгээгчид засуулахаар буцаалаа.${fixList}`,
      })),
    ]);

    const undoToken = createUndoToken(
      { kind: 'return-request', reportId, notificationIds, prev: returnFields(before) },
      user.id,
      report.updatedAt,
    );
    return NextResponse.json(
      { success: true, undoToken, warning: senderIds.length ? null : NO_SENDER_ACCOUNT_WARNING },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Буцаахад алдаа гарлаа.' }, { status: 500 });
  }
}
