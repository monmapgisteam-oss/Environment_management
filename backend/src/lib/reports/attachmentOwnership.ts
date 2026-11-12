import dataStore from '@/lib/db';
import { isUploadReference, referencedUploadIds } from '@/lib/db/storage';
import { isPdfName, parseAttachments } from '@shared/reports/attachments';

// Checks the files a sender puts on a report. A file already on the report
// (`kept`) may stay as it is. Every other file must be a PDF uploaded through
// the app by someone from the sender's own company, so a known upload id of
// another company cannot be attached, and not yet on another report, so a
// file of a sent report cannot be copied and then deleted with a draft.
// Returns the error to show, or null.
export async function attachmentError(
  fileUrl: unknown,
  sender: { id: string; companyId: string | null },
  kept: string[] = [],
  reportId?: string,
): Promise<string | null> {
  // The stored list is a JSON string; any other type is refused outright.
  if (fileUrl !== undefined && fileUrl !== null && typeof fileUrl !== 'string') return 'Файл буруу байна.';
  const keptUrls = new Set(kept);
  const added = parseAttachments(fileUrl).filter((file) => !keptUrls.has(file.url));
  if (added.length === 0) return null;

  if (added.some((file) => !isUploadReference(file.url))) return 'Файл буруу байна.';
  if (added.some((file) => !isPdfName(file.name))) return 'Зөвхөн PDF файл хавсаргана уу.';

  const ids = [...new Set(added.map((file) => file.url.slice(file.url.indexOf(':') + 1)))];
  const colleagues = sender.companyId
    ? (await dataStore.user.findMany({ where: { companyId: sender.companyId }, select: { id: true } })).map((user) => user.id)
    : [sender.id];
  const uploads = await dataStore.upload.findMany({
    where: { id: { in: ids }, ownerUserId: { in: colleagues } },
    select: { id: true, name: true },
  });
  if (uploads.length !== ids.length || uploads.some((upload) => !isPdfName(upload.name))) return 'Файл буруу байна.';
  const used = await referencedUploadIds(reportId);
  if (ids.some((id) => used.has(id.toLowerCase()))) return 'Файл буруу байна.';
  return null;
}
