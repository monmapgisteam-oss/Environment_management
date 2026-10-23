import dataStore from '@/lib/db';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createUndoToken, returnFields } from '@/lib/reports/undo';

// The manager rejects a staff member's return request — the report is fine and
// should stay in review. Clears the request flag and puts the report back into
// the review queue.
export async function POST(request: Request) {
  try {
    const { reportId } = await request.json();
    if (!reportId) {
      return NextResponse.json({ error: 'reportId is required' }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user || user.role !== 'review_manager') {
      return NextResponse.json({ error: 'Зөвхөн хянах менежер хүсэлтийг шийднэ.' }, { status: 403 });
    }

    const before = await dataStore.report.findUnique({ where: { id: reportId } });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй.' }, { status: 404 });
    }

    const report = await dataStore.report.update({
      where: { id: reportId },
      data: {
        status: 'in_review',
        returnReason: null,
        returnRequestedBy: null,
        revisionItems: null,
      },
    });

    const undoToken = createUndoToken({ kind: 'return-dismiss', reportId, prev: returnFields(before) }, user.id, report.updatedAt);
    return NextResponse.json({ success: true, undoToken }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Хүсэлт боловсруулахад алдаа гарлаа.' }, { status: 500 });
  }
}
