import dataStore from '@/lib/db';
import { createSignedUrl } from '@/lib/db/storage';
import type { Payload } from '@shared/db/types';
import { parseAttachments } from '@shared/reports/attachments';
import type { SenderConclusion } from '@shared/views/sender';

type ConclusionReport = Payload<'report', { include: { location: true } }>;

// A general evaluation conclusion for its edit form: the fields the form
// shows, the reviewers' comments, and its file with a short-lived link.
export async function loadConclusion(report: ConclusionReport): Promise<SenderConclusion> {
  const document = parseAttachments(report.fileUrl)[0];
  const comments = (
    await dataStore.reportComment.findMany({ where: { reportId: report.id }, orderBy: { createdAt: 'asc' } })
  ).map((comment) => ({
    id: comment.id,
    authorName: comment.authorName,
    authorRole: comment.authorRole,
    body: comment.body,
    createdAt: comment.createdAt.toISOString(),
  }));
  return {
    report: {
      id: report.id,
      year: report.year,
      conclusionNumber: report.conclusionNumber,
      description: report.description,
      projectName: report.projectName,
      reportCategory: report.reportCategory,
      implementerName: report.implementerName,
      location: report.location ? { district: report.location.district } : null,
    },
    comments,
    file: document ? { name: document.name, url: await createSignedUrl(document.url) } : null,
  };
}
