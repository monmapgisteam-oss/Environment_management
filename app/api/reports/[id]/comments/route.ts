import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { parseComment } from '@/lib/reports/reportComments';

// The admin or a review manager comments on a company's general evaluation
// conclusion. The sender's users and the other reviewers (admins and
// managers) are notified; the sender reads the comments on the conclusion page.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getApiUser('admin', 'review_manager');
  if (!user) return unauthorized();
  const { id } = await props.params;

  const parsed = parseComment(((await request.json().catch(() => null)) ?? {}).body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  try {
    const report = await dataStore.report.findUnique({
      where: { id },
      include: { senderCompany: { include: { users: { select: { id: true } } } } },
    });
    if (!report || report.title !== GENERAL_EVALUATION_CONCLUSION_TITLE) {
      return NextResponse.json({ error: 'Дүгнэлт олдсонгүй.' }, { status: 404 });
    }

    const comment = await dataStore.reportComment.create({
      data: {
        reportId: report.id,
        userId: user.id,
        authorName: user.name,
        authorRole: user.role as 'admin' | 'review_manager',
        body: parsed.body,
      },
    });

    try {
      const reviewers = await dataStore.user.findMany({
        where: { role: { in: ['admin', 'review_manager'] } },
        select: { id: true },
      });
      const preview = parsed.body.length > 140 ? `${parsed.body.slice(0, 140)}…` : parsed.body;
      await dataStore.notification.createMany({
        data: [
        ...report.senderCompany.users.map((u) => ({
          userId: u.id,
          reportId: report.id,
          title: 'Дүгнэлтэд тайлбар ирлээ',
          message: `"${report.projectName ?? ''}" төслийн ерөнхий үнэлгээний дүгнэлтэд ${user.name} тайлбар үлдээлээ: ${preview}`,
        })),
        ...reviewers
          .filter((u) => u.id !== user.id)
          .map((u) => ({
            userId: u.id,
            reportId: report.id,
            title: 'Дүгнэлтэд шинэ тайлбар',
            message: `${report.senderCompany.name}-ийн дүгнэлтэд ${user.name}: ${preview}`,
          })),
        ],
      });
    } catch (notifyError) {
      console.error('[reports/comments] notify failed:', notifyError);
    }

    return NextResponse.json(
      {
        comment: {
          id: comment.id,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
          body: comment.body,
          createdAt: comment.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error('[reports/comments] failed:', error);
    return NextResponse.json({ error: 'Тайлбар хадгалахад алдаа гарлаа.' }, { status: 500 });
  }
}
