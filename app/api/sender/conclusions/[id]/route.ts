import { NextResponse } from 'next/server';
import { getApiUser, unauthorized } from '@/lib/auth';
import { findOwnConclusion, notifyConclusionReviewers, readConclusionForm, updateConclusion } from '@/lib/reports/conclusionWrite';

// An approved sender company fixes one of its own conclusions: the fields and
// optionally a new PDF. The review managers are told to check it again.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getApiUser('sender');
  if (!user?.company) return unauthorized();
  const company = user.company;
  const { id } = await props.params;

  const report = await findOwnConclusion(company.id, id);
  if (!report) return NextResponse.json({ error: 'Дүгнэлт олдсонгүй.' }, { status: 404 });

  const form = await readConclusionForm(request, { requireFile: false });
  if ('error' in form) return NextResponse.json({ error: form.error }, { status: 400 });

  try {
    const { replacedFile } = await updateConclusion(report, form.input, form.file, user.id);
    await notifyConclusionReviewers(
      report.id,
      'Дүгнэлтээ засварлалаа',
      `${company.name} (РД ${company.registerNumber}) "${form.input.projectName}" төслийн дүгнэлтээ ${replacedFile ? 'шинэ файлаар ' : ''}засварлалаа.`,
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[sender/conclusions] update failed:', error);
    return NextResponse.json({ error: 'Хадгалахад алдаа гарлаа. Дахин оролдоно уу.' }, { status: 500 });
  }
}
