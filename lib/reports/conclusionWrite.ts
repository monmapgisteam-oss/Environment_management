import dataStore from '@/lib/db';
import { deleteUploads, uploadAttachment } from '@/lib/db/storage';
import { conclusionFileError, parseConclusion, type ConclusionInput } from '@/lib/auth/signup';
import { parseAttachments } from '@/lib/reports/attachments';
import { CONCLUSION_PROVINCE, GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { detectFileKind } from '@/lib/reports/fileType';
import { withNextReportNumber } from '@/lib/reports/reportNumber';
import { findReportTypeByKind, MISSING_TYPE_ERROR } from '@/lib/reports/reportTypes';

// Shared by the registration page (company not approved yet) and the sender
// portal (approved company): reading, checking, saving a general evaluation
// conclusion ("Ерөнхий үнэлгээний дүгнэлт") and telling the reviewers.

type Company = { id: string; name: string; registerNumber: string };

// The multipart form: the conclusion fields and an optional new PDF.
export async function readConclusionForm(
  request: Request,
  { requireFile }: { requireFile: boolean },
): Promise<{ input: ConclusionInput; file: File | null } | { error: string }> {
  const form = await request.formData().catch(() => null);
  if (!form) return { error: 'Хүсэлт буруу байна.' };
  const body: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) if (typeof value === 'string') body[key] = value;
  const upload = form.get('file');
  const file = upload && typeof upload !== 'string' && upload.size > 0 ? upload : null;

  const parsed = parseConclusion(body);
  if ('error' in parsed) return parsed;
  if (requireFile && !file) return { error: 'Ерөнхий үнэлгээний дүгнэлтийн PDF файлаа хавсаргана уу.' };
  if (file) {
    // The first bytes must say PDF too, not only the name.
    const fileError = conclusionFileError(file) ?? ((await detectFileKind(file)) === 'pdf' ? null : 'Дүгнэлтийг PDF файлаар хавсаргана уу.');
    if (fileError) return { error: fileError };
  }
  return { input: parsed.input, file };
}

// The company's own conclusion with that id, or null.
export async function findOwnConclusion(companyId: string, reportId: string) {
  const report = await dataStore.report.findUnique({ where: { id: reportId }, include: { location: true } });
  if (!report || report.senderCompanyId !== companyId || report.title !== GENERAL_EVALUATION_CONCLUSION_TITLE) return null;
  return report;
}

export async function updateConclusion(
  report: { id: string; fileUrl: string | null; location: { id: string } | null },
  input: ConclusionInput,
  file: File | null,
  userId: string,
) {
  const previousFiles = parseAttachments(report.fileUrl);
  const attachment = file ? await uploadAttachment(file, userId) : null;
  await dataStore.report.update({
    where: { id: report.id },
    data: {
      conclusionNumber: input.conclusionNumber,
      reportCategory: input.projectCategory,
      projectName: input.projectName,
      description: input.conclusionType || null,
      implementerName: input.implementerName,
      year: input.year,
      submittedAt: new Date(),
      ...(attachment ? { fileUrl: JSON.stringify([attachment]) } : {}),
    },
  });
  if (report.location) {
    await dataStore.reportLocation.update({ where: { id: report.location.id }, data: { district: input.district } });
  }
  if (attachment) await deleteUploads(previousFiles.map((f) => f.url));
  return { replacedFile: !!attachment };
}

export async function createConclusion(company: Company, input: ConclusionInput, file: File, userId: string) {
  const reportType = await findReportTypeByKind('performance');
  if (!reportType) throw new Error(MISSING_TYPE_ERROR);
  const attachment = await uploadAttachment(file, userId);
  return withNextReportNumber((reportNumber) =>
    dataStore.report.create({
      data: {
        reportNumber,
        conclusionNumber: input.conclusionNumber,
        reportTypeId: reportType.id,
        reportCategory: input.projectCategory,
        senderCompanyId: company.id,
        title: GENERAL_EVALUATION_CONCLUSION_TITLE,
        projectName: input.projectName,
        description: input.conclusionType || null,
        fileUrl: JSON.stringify([attachment]),
        implementerName: input.implementerName,
        implementerRegister: company.registerNumber,
        status: 'submitted',
        year: input.year,
        submittedAt: new Date(),
        location: { create: { province: CONCLUSION_PROVINCE, district: input.district, khoroo: 'Тодорхойгүй' } },
      },
    }),
  );
}

// The review managers (and admins) learn about a new or changed conclusion.
export async function notifyConclusionReviewers(reportId: string, title: string, message: string) {
  try {
    const reviewers = await dataStore.user.findMany({
      where: { role: { in: ['admin', 'review_manager'] } },
      select: { id: true },
    });
    await dataStore.notification.createMany({
      data: reviewers.map((reviewer) => ({ userId: reviewer.id, reportId, title, message })),
    });
  } catch (notifyError) {
    console.error('[conclusion] notify failed:', notifyError);
  }
}
