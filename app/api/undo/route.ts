import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import { undoAction, UndoError } from '@/lib/reports/undo';

// Takes back a manager's or staff member's last action on a report, using the
// undo token that action returned (lib/reports/undo.ts).
export async function POST(request: Request) {
  const user = await getApiUser('review_manager', 'evaluator');
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  try {
    const reportId = await undoAction(body?.token, user.id);
    return NextResponse.json({ success: true, reportId });
  } catch (error) {
    if (error instanceof UndoError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('[undo] failed:', error);
    return NextResponse.json({ error: 'Буцаахад алдаа гарлаа.' }, { status: 500 });
  }
}
