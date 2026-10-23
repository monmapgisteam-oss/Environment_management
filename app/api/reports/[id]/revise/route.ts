import { NextResponse } from 'next/server';
import dataStore from '@/lib/db';
import { canAccessReport, getApiUser, unauthorized } from '@/lib/auth';
import { deleteUploads, droppedReferences, isUploadReference } from '@/lib/db/storage';
import { parseAttachments, type Attachment } from '@/lib/reports/attachments';
import { applySectionFixes, filesOfSection, parseRevisionItems } from '@/lib/reports/revisions';
import { notifyReportResubmitted } from '@/lib/reports/resubmitNotifications';

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

// The sender fixes only the sections the reviewer flagged (report.revisionItems):
// each flagged section gets its kept files plus new uploads, every other file
// stays, and the report goes back to the review organisation.
export async function POST(request: Request, props: { params: Promise<{ id: string }> }) {
  const user = await getApiUser('sender');
  if (!user) return unauthorized();
  const { id } = await props.params;

  try {
    const report = await dataStore.report.findUnique({ where: { id }, include: { senderCompany: true } });
    if (!report || !(await canAccessReport(user, report))) return unauthorized();
    if (report.status !== 'needs_revision') {
      return NextResponse.json({ error: 'Энэ тайлан засвар шаардаагүй байна.' }, { status: 400 });
    }
    const items = parseRevisionItems(report.revisionItems);
    if (items.length === 0) {
      return NextResponse.json({ error: 'Засах хэсэг заагаагүй тайлан. Бүтэн маягтаар засна уу.' }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const fixes = readFixes(body?.fixes).filter((fix) => items.some((item) => item.key === fix.key));
    const attachments = parseAttachments(report.fileUrl);

    // New files must be uploads this sender made through the app.
    const added = fixes.flatMap((fix) => fix.added);
    if (added.some((file) => !isUploadReference(file.url))) {
      return NextResponse.json({ error: 'Файл буруу байна.' }, { status: 400 });
    }
    const uploadIds = added.map((file) => file.url.slice(file.url.indexOf(':') + 1));
    if (uploadIds.length) {
      const owned = await dataStore.upload.count({ where: { id: { in: uploadIds }, ownerUserId: user.id } });
      if (owned !== uploadIds.length) return NextResponse.json({ error: 'Файл буруу байна.' }, { status: 400 });
    }

    // Every flagged section must change: a new file or a removed one.
    for (const item of items) {
      const fix = fixes.find((candidate) => candidate.key === item.key);
      const current = filesOfSection(attachments, item.key);
      const removed = fix ? current.filter((file) => !fix.keepUrls.includes(file.url)).length : 0;
      if (!fix || (fix.added.length === 0 && removed === 0)) {
        return NextResponse.json({ error: `"${item.label}" хэсгийг засна уу.`, key: item.key }, { status: 400 });
      }
    }

    const fixedFiles = applySectionFixes(attachments, fixes);
    const updated = await dataStore.report.update({
      where: { id },
      data: {
        fileUrl: JSON.stringify(fixedFiles),
        status: 'submitted',
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
