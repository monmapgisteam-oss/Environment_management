import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { getRegistrationApiUser, unauthorized } from '@/lib/auth';
import { conclusionFileError, parseConclusion } from '@/lib/auth/signup';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { parseAttachments } from '@/lib/reports/attachments';
import { deleteUploads, uploadAttachment } from '@/lib/db/storage';

// A sender whose company is not approved yet fixes the general evaluation
// conclusion sent at sign-up: the fields, and optionally a new PDF. A rejected
// company goes back to waiting for the admin. The admins and review managers
// are told to check it again.
export async function POST(request: Request) {
  const user = await getRegistrationApiUser();
  if (!user?.company) return unauthorized();
  const company = user.company;

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: 'Хүсэлт буруу байна.' }, { status: 400 });
  const body: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') body[key] = value;
  }
  const upload = form.get('file');
  const file = upload && typeof upload !== 'string' && upload.size > 0 ? upload : null;

  const parsed = parseConclusion(body);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (file) {
    const fileError = conclusionFileError(file);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });
  }
  const conclusion = parsed.input;

  try {
    const report = await dataStore.report.findFirst({
      where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
      include: { location: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!report) return NextResponse.json({ error: 'Дүгнэлт олдсонгүй.' }, { status: 404 });

    const previousFiles = parseAttachments(report.fileUrl);
    const attachment = file ? await uploadAttachment(file, user.id) : null;

    await dataStore.report.update({
      where: { id: report.id },
      data: {
        conclusionNumber: conclusion.conclusionNumber,
        reportCategory: conclusion.projectCategory,
        projectName: conclusion.projectName,
        description: conclusion.conclusionType,
        implementerName: conclusion.implementerName,
        year: conclusion.year,
        submittedAt: new Date(),
        ...(attachment ? { fileUrl: JSON.stringify([attachment]) } : {}),
      },
    });
    if (report.location) {
      await dataStore.reportLocation.update({ where: { id: report.location.id }, data: { district: conclusion.district } });
    }
    if (attachment) await deleteUploads(previousFiles.map((f) => f.url));

    const wasRejected = company.approvalStatus === 'rejected';
    if (wasRejected) {
      await dataStore.company.update({ where: { id: company.id }, data: { approvalStatus: 'pending' } });
    }

    try {
      const reviewers = await dataStore.user.findMany({
        where: { role: { in: ['admin', 'review_manager'] } },
        select: { id: true },
      });
      await dataStore.notification.createMany({
        data: reviewers.map((reviewer) => ({
          userId: reviewer.id,
          reportId: report.id,
          title: 'Дүгнэлтээ засварлаж илгээлээ',
          message: `${company.name} (РД ${company.registerNumber}) ерөнхий үнэлгээний дүгнэлтээ ${
            attachment ? 'шинэ файлаар ' : ''
          }засварлаж дахин илгээлээ. Шалгана уу.`,
        })),
      });
    } catch (notifyError) {
      console.error('[registration/conclusion] notify failed:', notifyError);
    }

    return NextResponse.json({ success: true, resubmitted: wasRejected });
  } catch (error) {
    console.error('[registration/conclusion] failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
