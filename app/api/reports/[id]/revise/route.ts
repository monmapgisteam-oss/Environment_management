import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { canAccessReport, getApiUser, unauthorized } from '@/lib/auth';
import { deleteUploads, droppedReferences } from '@/lib/db/storage';
import { parseAttachments, type Attachment } from '@/lib/reports/attachments';
import { applySectionFixes, filesOfSection, parseRevisionItems } from '@/lib/reports/revisions';
import { notifyReportResubmitted } from '@/lib/reports/resubmitNotifications';
import { attachmentError } from '@/lib/reports/attachmentOwnership';
import { ANNEX, MAIN_DOCUMENT_ID, REQUIRED_ANNEX_MATERIALS, missingAnnexMaterial } from '@/lib/reports/materials';
import { statusFromEvaluations } from '@/lib/reports/transitions';

type Fix = { key: string; keepUrls: string[]; added: Attachment[] };

function readFixes(input: unknown): Fix[] {
  if (!Array.isArray(input)) return [];
  return input.map((raw) => ({
    key: typeof raw?.key === 'string' ? raw.key : '',
    keepUrls: Array.isArray(raw?.keepUrls) ? raw.keepUrls.filter((url: unknown): url is string => typeof url === 'string') : [],
    added: Array.isArray(raw?.added)
      ? raw.added
          .filter((file: unknown): file is Attachment => !!file && typeof (file as Attachment).url === 'string')
          .map((file: Attachment) => ({ url: file.url, name: typeof file.name === 'string' ? file.name.slice(0, 255) : 'file' }))
      : [],
  }));
}

// The sender answers a return: the reviewer's comments (report.revisionItems)
// name the criteria that fell short, and the sender sends a corrected report
// and/or Хавсралт. Other files stay; the report goes back to review.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getApiUser('sender');
  if (!user) return unauthorized();
  const { id } = await props.params;

  try {
    const report = await dataStore.report.findUnique({
      where: { id },
      include: { senderCompany: true, assignments: { include: { evaluator: { select: { id: true, role: true } }, evaluation: true } } },
    });
    if (!report || !(await canAccessReport(user, report))) return unauthorized();
    if (report.status !== 'needs_revision') {
      return NextResponse.json({ error: 'Энэ тайлан засвар шаардаагүй байна.' }, { status: 400 });
    }
    const items = parseRevisionItems(report.revisionItems);

    const body = await request.json().catch(() => null);
    // Only the report and its Хавсралт are sent again.
    const documentKeys = [MAIN_DOCUMENT_ID, ANNEX.id, ...REQUIRED_ANNEX_MATERIALS.map((material) => material.id)]
      .map((id) => `material:${id}`);
    const fixes = readFixes(body?.fixes).filter((fix) => documentKeys.includes(fix.key));
    const attachments = parseAttachments(report.fileUrl);

    // New files must be PDF uploads made through the app by this company,
    // the same rule as the full form (lib/reports/attachmentOwnership.ts).
    const added = fixes.flatMap((fix) => fix.added);
    const fileError = await attachmentError(JSON.stringify(added), user);
    if (fileError) return NextResponse.json({ error: fileError }, { status: 400 });

    // Something must actually change.
    const changed = fixes.some((fix) => {
      const current = filesOfSection(attachments, fix.key);
      return fix.added.length > 0 || current.some((file) => !fix.keepUrls.includes(file.url));
    });
    if (!changed) {
      return NextResponse.json({ error: 'Засварласан файлаа хавсаргана уу.' }, { status: 400 });
    }

    const fixedFiles = applySectionFixes(attachments, fixes);
    // The main document can be replaced but not removed.
    const isMain = (file: Attachment) => file.materialId === MAIN_DOCUMENT_ID;
    if (!fixedFiles.some(isMain)) {
      return NextResponse.json({ error: 'Үндсэн баримт бичгийг хавсаргана уу.' }, { status: 400 });
    }
    const missingAnnex = missingAnnexMaterial(fixedFiles);
    if (missingAnnex) {
      return NextResponse.json({ error: `«${missingAnnex.label}» баримт бичгийг (PDF) хавсаргана уу.` }, { status: 400 });
    }
    const updated = await dataStore.report.update({
      where: { id },
      data: {
        fileUrl: JSON.stringify(fixedFiles),
        // Back to where scoring stood: evaluators already assigned carry on.
        status: report.assignments.length ? statusFromEvaluations(report.assignments) : 'submitted',
        submittedAt: new Date(),
        returnReason: null,
        returnRequestedBy: null,
        revisionItems: null,
      },
    });

    // Files the sender replaced or removed are deleted for good.
    await deleteUploads(droppedReferences(attachments, fixedFiles));

    try {
      await notifyReportResubmitted({
        reportId: id,
        reportNumber: updated.reportNumber,
        senderName: report.senderCompany?.name ?? 'Илгээгч',
        fixed: items.map((item) => item.label),
      });
    } catch (notifyError) {
      console.error('[revise] notification failed:', notifyError);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[revise] failed:', error);
    return NextResponse.json({ error: 'Засвар илгээхэд алдаа гарлаа.' }, { status: 500 });
  }
}
