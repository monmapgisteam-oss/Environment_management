import type { Attachment } from '@/lib/reports/attachments';
import { reportKind, type ReportTypeRef } from '@/lib/reports/terms';

// Documents a plan or performance report attaches: the document itself,
// required annex documents, and optional additional annex files.
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
export const REQUIRED_ANNEX_MATERIALS: ReportMaterial[] = [
  { id: 'official-request', label: 'Албан хүсэлт' },
  { id: 'state-registration-certificate', label: 'Улсын бүртгэлийн гэрчилгээ' },
  { id: 'land-documents', label: 'Газрын бичиг баримт' },
];

export function missingAnnexMaterial(attachments: Attachment[]): ReportMaterial | undefined {
  return REQUIRED_ANNEX_MATERIALS.find((material) => !attachments.some((file) => file.materialId === material.id));
}

function mainDocument(reportType: ReportTypeRef): ReportMaterial {
  return {
    id: MAIN_DOCUMENT_ID,
    label:
      reportKind(reportType) === 'plan'
        ? 'Байгаль орчны менежментийн жилийн төлөвлөгөө'
        : 'Байгаль орчны менежментийн төлөвлөгөөний биелэлтийн тайлан',
  };
}

// Upload slots shared by plans and performance reports.
export function documentRows(reportType: ReportTypeRef): ReportMaterial[] {
  return [mainDocument(reportType), ANNEX, ...REQUIRED_ANNEX_MATERIALS];
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
