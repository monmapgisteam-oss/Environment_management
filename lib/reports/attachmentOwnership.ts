import dataStore from '@/lib/db';
import { isUploadReference } from '@/lib/db/storage';
import { isPdfName, parseAttachments } from '@/lib/reports/attachments';

// Checks the files a sender puts on a report. A file already on the report
// (`kept`) may stay as it is. Every other file must be a PDF uploaded through
// the app by someone from the sender's own company, so a known upload id of
// another company cannot be attached. Returns the error to show, or null.
export async function attachmentError(
  fileUrl: unknown,
  sender: { id: string; companyId: string | null },
  kept: string[] = [],
): Promise<string | null> {
  const keptUrls = new Set(kept);
  const added = parseAttachments(typeof fileUrl === 'string' ? fileUrl : null).filter((file) => !keptUrls.has(file.url));
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
  return null;
}
