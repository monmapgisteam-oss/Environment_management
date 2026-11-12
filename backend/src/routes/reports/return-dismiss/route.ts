import dataStore from '@/lib/db';
import { NextResponse } from '@/http/next';
import { getApiUser, unauthorized } from '@/lib/auth';
import { createNotifications, createUndoToken, returnFields } from '@/lib/reports/undo';
import { canTransition, statusFromEvaluations, transitionError } from '@/lib/reports/transitions';

// The manager rejects a staff member's return request — the report is fine and
// should stay in review. Clears the request flag and puts the report back to
// the status its evaluations give it, then tells the evaluator who asked.
export async function POST(request: Request) {
  try {
    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getApiUser('review_manager');
    if (!user) return unauthorized();

    const before = await dataStore.report.findUnique({
      where: { id: reportId },
      include: { assignments: { include: { evaluator: { select: { id: true, role: true } }, evaluation: true } } },
    });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }
    if (!canTransition(before.status, 'dismissReturn')) {
      return NextResponse.json({ error: transitionError('dismissReturn') }, { status: 409 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: statusFromEvaluations(before.assignments),
        returnReason: null,
        returnRequestedBy: null,
        revisionItems: null,
      },
    });

    // The evaluator who asked learns the report stays in review.
    if (before.returnRequestedBy) {
      try {
        // Only one of this report's own evaluators can be the one who asked.
        const requester = await dataStore.user.findFirst({
          where: {
            name: before.returnRequestedBy,
            role: 'evaluator',
            id: { in: before.assignments.map((assignment) => assignment.evaluatorUserId) },
          },
          select: { id: true },
        });
        if (requester) {
          await createNotifications([
            {
              userId: requester.id,
              reportId,
              title: 'Буцаах хүсэлт татгалзсан',
              message: `"${report.reportNumber}" тайланг буцаах хүсэлтийг менежер татгалзлаа. Үнэлгээгээ үргэлжлүүлнэ үү.`,
            },
          ]);
        }
      } catch (notifyError) {
        console.error('[return-dismiss] notify failed:', notifyError);
      }
    }

    const undoToken = createUndoToken({ kind: 'return-dismiss', reportId, prev: returnFields(before) }, user.id, report.updatedAt);
    return NextResponse.json({ success: true, undoToken }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Хүсэлт боловсруулахад алдаа гарлаа.' }, { status: 500 });
  }
}
