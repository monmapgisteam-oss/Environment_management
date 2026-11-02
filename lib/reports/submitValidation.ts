import { REPORT_CATEGORIES } from '@/lib/constants';
import { parseAttachments } from '@/lib/reports/attachments';
import { MAIN_DOCUMENT_ID } from '@/lib/reports/materials';

type SubmitFields = {
  title?: unknown;
  reportCategory?: unknown;
  approvedDate?: unknown;
  fileUrl?: unknown;
  latitude?: unknown;
  longitude?: unknown;
};

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// What a plan or performance report must have before it is sent (a draft may
// be saved without them). Returns the first thing missing, or null.
// `requireMainDocument` is off only for reports filed under the older
// per-table document lists, which have no main document row.
export function submissionError(data: SubmitFields, requireMainDocument = true): string | null {
  if (!text(data.title)) return 'Төслийн нэрийг оруулна уу.';
  if (!REPORT_CATEGORIES.includes(text(data.reportCategory))) return 'Төслийн ангиллыг сонгоно уу.';
  if (!text(data.approvedDate) || Number.isNaN(new Date(text(data.approvedDate)).getTime())) {
    return 'Батлагдсан огноог оруулна уу.';
  }
  if (data.latitude == null || data.longitude == null || data.latitude === '' || data.longitude === '') {
    return 'Газрын зураг дээр байршлаа сонгоно уу.';
  }
  const files = parseAttachments(typeof data.fileUrl === 'string' ? data.fileUrl : null);
  if (requireMainDocument && !files.some((file) => file.materialId === MAIN_DOCUMENT_ID)) {
    return 'Үндсэн баримт бичгээ (PDF) хавсаргана уу.';
  }
  return null;
}
