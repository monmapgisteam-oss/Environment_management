import { NextResponse } from '@/http/next';
import dataStore from '@/lib/db';
import { getRegistrationApiUser, unauthorized } from '@/lib/auth';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { notifyConclusionReviewers, readConclusionForm, updateConclusion } from '@/lib/reports/conclusionWrite';

// A sender whose company is not approved yet fixes the general evaluation
// conclusion sent at sign-up: the fields, and optionally a new PDF. A rejected
// company goes back to waiting for the review manager, who is told to check it again.
export async function POST(request: Request) {
  const user = await getRegistrationApiUser();
  if (!user?.company) return unauthorized();
  const company = user.company;

  const form = await readConclusionForm(request, { requireFile: false });
  if ('error' in form) return NextResponse.json({ error: form.error }, { status: 400 });

  try {
    const report = await dataStore.report.findFirst({
      where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
      include: { location: true },
      orderBy: { createdAt: 'asc' },
    });
    if (!report) return NextResponse.json({ error: 'Дүгнэлт олдсонгүй.' }, { status: 404 });

    const { replacedFile } = await updateConclusion(report, form.input, form.file, user.id);
    const wasRejected = company.approvalStatus === 'rejected';
    if (wasRejected) {
      await dataStore.company.update({ where: { id: company.id }, data: { approvalStatus: 'pending' } });
    }
    await notifyConclusionReviewers(
      report.id,
      'Дүгнэлтээ засварлаж илгээлээ',
      `${company.name} (РД ${company.registerNumber}) ерөнхий үнэлгээний дүгнэлтээ ${replacedFile ? 'шинэ файлаар ' : ''}засварлаж дахин илгээлээ. Шалгана уу.`,
    );
    return NextResponse.json({ success: true, resubmitted: wasRejected });
  } catch (error) {
    console.error('[registration/conclusion] failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
