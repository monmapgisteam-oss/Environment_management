import type { Attachment } from '@/lib/reports/attachments';

// Documents a plan or performance report attaches: the document itself and
// one "Хавсралт" row for everything that goes with it.
// Uploaded files carry the row's `id` as `materialId`. Reports saved with the
// older per-table lists keep those ids and show as "Өмнөх хавсралт" rows.

export type ReportMaterial = {
  id: string;
  label: string;
  // The regulation's own instruction for the photos, shown under the label.
  note?: string;
};

// Журмын 3 дугаар хавсралтын А хэсэг: the plan of each category is made of
// these tables. They are not upload rows.
// The id after "plan-" names the table's template file in
// public/samples/<category folder>/ (lib/reports/samples.ts).
const PLAN_NEGATIVE_IMPACT: ReportMaterial = { id: 'plan-negative-impact', label: 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө' };
const PLAN_HERITAGE: ReportMaterial = { id: 'plan-heritage', label: 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө' };
const PLAN_RISK: ReportMaterial = { id: 'plan-risk', label: 'Осол, эрсдэлийн менежментийн төлөвлөгөө' };
const PLAN_WASTE: ReportMaterial = { id: 'plan-waste', label: 'Хог, хаягдлын менежментийн төлөвлөгөө' };
const PLAN_MONITORING: ReportMaterial = { id: 'plan-monitoring', label: 'Орчны хяналт шинжилгээний хөтөлбөр' };
const PLAN_MANAGEMENT: ReportMaterial = { id: 'plan-management', label: 'Удирдлага зохион байгуулалтын төлөвлөгөө' };
const PLAN_REPORTING: ReportMaterial = { id: 'plan-reporting', label: 'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөө' };

export const PLAN_MATERIALS: Record<string, ReportMaterial[]> = {
  'Уул уурхай, газрын тос': [
    PLAN_NEGATIVE_IMPACT,
    {
      id: 'plan-rehabilitation',
      label: 'Нөхөн сэргээлтийн төлөвлөгөө /техникийн нөхөн сэргээлт, биологийн нөхөн сэргээлт, татан буулгах, хаалтад бэлтгэх/',
    },
    { id: 'plan-biodiversity', label: 'Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээний төлөвлөгөө' },
    { id: 'plan-resettlement', label: 'Нүүлгэн шилжүүлэх, нөхөн олговор олгох арга хэмжээний төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  'Дэд бүтэц, барилга, ШТС': [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  'Аялал жуулчлал, үйлчилгээ': [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  Үйлдвэрлэл: [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
};

const PLAN_REPORT_TYPE = 'Жилийн төлөвлөгөө';

export const MAIN_DOCUMENT_ID = 'main-document';
export const ANNEX: ReportMaterial = { id: 'annex', label: 'Хавсралт' };

function mainDocument(reportType: string | null | undefined): ReportMaterial {
  return {
    id: MAIN_DOCUMENT_ID,
    label:
      reportType === PLAN_REPORT_TYPE
        ? 'Байгаль орчны менежментийн жилийн төлөвлөгөө'
        : 'Байгаль орчны менежментийн төлөвлөгөөний биелэлтийн тайлан',
  };
}

export function materialsFor(
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
): ReportMaterial[] {
  if (!reportCategory) return [];
  return [mainDocument(reportType), ANNEX];
}

// Heading for the document list of a report.
export function materialsTitle(_reportType?: string | null) {
  return 'Бичиг баримтын бүрдэл';
}

// Files saved under a document row the list no longer has (an older version
// of the plan list), so they stay visible on the report.
export function leftoverMaterialGroups(
  attachments: Attachment[],
  reportType: string | null | undefined,
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
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
) {
  return materialsFor(reportType, reportCategory)
    .map((material) => ({ material, files: attachments.filter((file) => file.materialId === material.id) }))
    .filter((group) => group.files.length > 0);
}
