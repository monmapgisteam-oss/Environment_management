import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import { createConclusion, notifyConclusionReviewers, readConclusionForm } from '@/lib/reports/conclusionWrite';

// An approved sender company adds another general evaluation conclusion (a
// further project). The review managers are told to check it.
export async function POST(request: Request) {
  const user = await getApiUser('sender');
  if (!user?.company) return unauthorized();
  const company = user.company;

  const form = await readConclusionForm(request, { requireFile: true });
  if ('error' in form) return NextResponse.json({ error: form.error }, { status: 400 });

  try {
    const report = await createConclusion(company, form.input, form.file as File, user.id);
    await notifyConclusionReviewers(
      report.id,
      'Шинэ ерөнхий үнэлгээний дүгнэлт',
      `${company.name} (РД ${company.registerNumber}) "${form.input.projectName}" төслийн ерөнхий үнэлгээний дүгнэлт илгээлээ.`,
    );
    return NextResponse.json({ success: true, id: report.id }, { status: 201 });
  } catch (error) {
    console.error('[sender/conclusions] create failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
