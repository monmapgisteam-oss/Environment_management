import type { Attachment } from '@/lib/reports/attachments';
import { reportKind, type ReportTypeRef } from '@/lib/reports/terms';

// Documents a plan or performance report attaches: the document itself and
// one "Хавсралт" row for everything that goes with it.
// Uploaded files carry the row's `id` as `materialId`. Reports saved with the
// older per-table lists keep those ids and show as "Өмнөх хавсралт" rows.

export type ReportMaterial = {
  id: string;
  label: string;
  // Optional hint shown under the label.
  note?: string;
};

export const MAIN_DOCUMENT_ID = 'main-document';
export const ANNEX: ReportMaterial = { id: 'annex', label: 'Хавсралт' };

function mainDocument(reportType: ReportTypeRef): ReportMaterial {
  return {
    id: MAIN_DOCUMENT_ID,
    label:
      reportKind(reportType) === 'plan'
        ? 'Байгаль орчны менежментийн жилийн төлөвлөгөө'
        : 'Байгаль орчны менежментийн төлөвлөгөөний биелэлтийн тайлан',
  };
}

// The two files every plan and performance report carries.
export function documentRows(reportType: ReportTypeRef): ReportMaterial[] {
  return [mainDocument(reportType), ANNEX];
}

export function materialsFor(
  reportType: ReportTypeRef,
  reportCategory: string | null | undefined,
): ReportMaterial[] {
  if (!reportCategory) return [];
  return documentRows(reportType);
}

// Heading for the document list of a report.
export function materialsTitle(_reportType?: ReportTypeRef) {
  return 'Бичиг баримтын бүрдэл';
}

// Files saved under a document row the list no longer has (an older version
// of the plan list), so they stay visible on the report.
export function leftoverMaterialGroups(
  attachments: Attachment[],
  reportType: ReportTypeRef,
  reportCategory: string | null | undefined,
) {
  const known = new Set(materialsFor(reportType, reportCategory).map((material) => material.id));
  const ids = [...new Set(attachments.map((file) => file.materialId).filter((id): id is string => !!id && !known.has(id)))];
  return ids.map((id, index) => ({
    material: { id, label: `Өмнөх хавсралт ${index + 1}` } as ReportMaterial,
    files: attachments.filter((file) => file.materialId === id),
  }));
}

// Files of each material of the report's category that has any, in list order.
export function groupMaterialAttachments(
  attachments: Attachment[],
  reportType: ReportTypeRef,
  reportCategory: string | null | undefined,
) {
  return materialsFor(reportType, reportCategory)
    .map((material) => ({ material, files: attachments.filter((file) => file.materialId === material.id) }))
    .filter((group) => group.files.length > 0);
}
