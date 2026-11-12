import dataStore from '@/lib/db';
import { NextResponse } from '@/http/next';
import { getApiUser, unauthorized } from '@/lib/auth';
import { createNotifications, createUndoToken, returnFields } from '@/lib/reports/undo';
import { loadReturnSections } from '@/lib/reports/reportSections';
import { cleanRevisionItems, serializeRevisionItems } from '@shared/reports/revisions';
import { canTransition, signingProgress, transitionError } from '@/lib/reports/transitions';
import { nounForReportType } from '@shared/reports/terms';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { NO_SENDER_ACCOUNT_WARNING, senderRecipientIds } from '@/lib/reports/companies';

// The manager returns a report to the sender company for revision. This is the
// final return step: the sender sees status "Засвар шаардсан" with the reason.
// A manager may return a report whether or not staff requested it first, but
// not once every evaluator has signed (lib/reports/transitions.ts).
export async function POST(request: Request) {
  try {
    const { reportId, reason, items } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getApiUser('review_manager');
    if (!user) return unauthorized();

    const before = await dataStore.report.findUnique({
      where: { id: reportId },
      include: { reportType: true, assignments: { include: { evaluation: true } } },
    });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    // A general evaluation conclusion is not a report the sender revises.
    if (before.title === GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Дүгнэлтийг буцаах боломжгүй.' }, { status: 400 });
    }
    // Once every evaluator has signed, the scores are final: the manager
    // approves them instead of returning the report.
    if (!canTransition(before.status, 'returnToSender') || signingProgress(before.assignments).allSigned) {
      return NextResponse.json({ error: transitionError('returnToSender') }, { status: 409 });
    }
    // The sections the sender must fix, each with the manager's comment.
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
        returnRequestedBy: null,
        revisionItems: serializeRevisionItems(revisionItems),
      },
    });
    const senderIds = await senderRecipientIds(report);

    // Notify the sender company so they can revise and resubmit.
    const noun = nounForReportType(before.reportType);
    const notificationIds = await createNotifications(
      senderIds.map((userId) => ({
        userId,
        reportId,
        title: `${noun.one === 'БОМТ' ? 'БОМТ' : 'Тайлан'} буцаагдлаа`,
        message: `"${report.reportNumber}" ${noun.one} засвар шаардсан байна.${
          revisionItems.length ? ` Засах хэсэг: ${revisionItems.length}.` : ''
        }${report.returnReason ? ` Шалтгаан: ${report.returnReason}` : ''}`,
      })),
    );
    // Assigned evaluators learn the report went back, so they pause scoring.
    const evaluatorIds = [...new Set(before.assignments.map((a) => a.evaluatorUserId))];
    notificationIds.push(
      ...(await createNotifications(
        evaluatorIds.map((userId) => ({
          userId,
          reportId,
          title: 'Тайлан илгээгчид буцаагдлаа',
          message: `"${report.reportNumber}" тайланг засуулахаар илгээгчид буцаалаа. Засварласны дараа дахин үнэлнэ.`,
        })),
      )),
    );

    const undoToken = createUndoToken(
      { kind: 'return-to-sender', reportId, notificationIds, prev: returnFields(before) },
      user.id,
      report.updatedAt,
    );
    return NextResponse.json(
      { success: true, undoToken, warning: senderIds.length ? null : NO_SENDER_ACCOUNT_WARNING },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Тайлан буцаахад алдаа гарлаа.' }, { status: 500 });
  }
}
