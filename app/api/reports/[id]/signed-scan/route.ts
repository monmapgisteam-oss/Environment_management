import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { senderRecipientIds } from '@/lib/reports/companies';
import { getApiUser, unauthorized } from '@/lib/auth';
import { isUploadReference } from '@/lib/db/storage';
import { createNotifications, createUndoToken } from '@/lib/reports/undo';

// Manager uploads the scanned, physically-signed score sheet (after printing
// the evaluation table and getting every evaluator's signature on paper) and
// it's attached to the report for the sender to download. The scores must be
// approved with the manager's digital signature first.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getApiUser('review_manager');
  if (!user) return unauthorized();
  const params = await props.params;
  try {
    const { url, name } = await request.json();
    // Only a file uploaded through the app, never an outside address.
    if (!isUploadReference(url)) {
      return NextResponse.json({ error: 'Файл сонгоогүй байна.' }, { status: 400 });
    }
    // Only a file this manager uploaded, never someone else's private upload.
    const owned = await dataStore.upload.count({ where: { id: url.slice(url.indexOf(':') + 1), ownerUserId: user.id } });
    if (owned !== 1) return NextResponse.json({ error: 'Файл буруу байна.' }, { status: 400 });

    const before = await dataStore.report.findUnique({ where: { id: params.id } });
    if (!before) {
      return NextResponse.json({ error: 'Тайлан олдсонгүй' }, { status: 404 });
    }
    if (!before.scoresApprovedAt) {
      return NextResponse.json({ error: 'Эхлээд үнэлгээг тоон гарын үсгээр баталгаажуулна уу.' }, { status: 400 });
    }

    const report = await dataStore.report.update({
      where: { id: params.id },
      data: {
        signedScanUrl: url,
        signedScanName: typeof name === 'string' ? name.slice(0, 255) : null,
        signedScanUploadedAt: new Date(),
      },
      include: { senderCompany: { include: { users: { select: { id: true } } } } },
    });

    let notificationIds: string[] = [];
    try {
      notificationIds = await createNotifications(
        (await senderRecipientIds(report)).map((userId) => ({
          userId,
          reportId: report.id,
          title: 'Гарын үсэгтэй тайлан ирлээ',
          message: `"${report.title}" тайлангийн гарын үсэгтэй хуулбар ирлээ.`,
        })),
      );
    } catch (notifyError) {
      console.error('Failed to notify sender of signed scan', notifyError);
    }

    const undoToken = createUndoToken(
      {
        kind: 'signed-scan',
        reportId: report.id,
        notificationIds,
        prev: {
          signedScanUrl: before.signedScanUrl,
          signedScanName: before.signedScanName,
          signedScanUploadedAt: before.signedScanUploadedAt ? new Date(before.signedScanUploadedAt).getTime() : null,
        },
      },
      user.id,
      report.updatedAt,
    );
    return NextResponse.json({ ...report, undoToken });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Хуулгыг хадгалахад алдаа гарлаа' }, { status: 500 });
  }
}
