import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getApiUser, unauthorized } from '@/lib/auth';
import { isUploadReference } from '@/lib/db/storage';

// Manager uploads the scanned, physically-signed score sheet (after printing
// the evaluation table and getting every evaluator's signature on paper) and
// it's attached to the report for the sender to download.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  if (!(await getApiUser('review_manager'))) return unauthorized();
  const params = await props.params;
  try {
    const { url, name } = await request.json();
    // Only a file uploaded through the app, never an outside address.
    if (!isUploadReference(url)) {
      return NextResponse.json({ error: 'url required' }, { status: 400 });
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

    try {
      const senderUsers = report.senderCompany.users;
      if (senderUsers.length > 0) {
        await dataStore.notification.createMany({
          data: senderUsers.map((u) => ({
            userId: u.id,
            reportId: report.id,
            title: 'Гарын үсэгтэй тайлан ирлээ',
            message: `"${report.title}" тайлангийн гарын үсэгтэй хуулбар ирлээ.`,
          })),
        });
      }
    } catch (notifyError) {
      console.error('Failed to notify sender of signed scan', notifyError);
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Хуулгыг хадгалахад алдаа гарлаа' }, { status: 500 });
  }
}
