import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

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

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'in_review',
        returnReason: null,
        returnRequestedBy: null,
      },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Хүсэлт боловсруулахад алдаа гарлаа.' }, { status: 500 });
  }
}
