import dataStore from '@/lib/db';
import { REPORT_CATEGORIES } from '@/lib/constants';

// Each report category is scored on its own sheet of criteria (Журмын 4 дүгээр
// хавсралт), and senders attach evidence per criterion. Reports filed before
// categories existed have none and keep the production sheet they were always
// scored on.
export const DEFAULT_REPORT_CATEGORY = 'Үйлдвэрлэл';

export function criteriaCategory(reportCategory: string | null | undefined) {
  return reportCategory && REPORT_CATEGORIES.includes(reportCategory) ? reportCategory : DEFAULT_REPORT_CATEGORY;
}

// Plans (Жилийн төлөвлөгөө) and performance reports are scored on separate
// sheets. Older criteria have no sheet and belong to the performance sheet.
export type CriteriaSheet = 'plan' | 'performance';

export function sheetForReportType(reportTypeName: string | null | undefined): CriteriaSheet {
  return reportTypeName?.includes('Жилийн') ? 'plan' : 'performance';
}

function sheetWhere(sheet: CriteriaSheet) {
  return sheet === 'plan' ? { sheet: 'plan' as const } : { OR: [{ sheet: null }, { sheet: 'performance' as const }] };
}

export async function fetchCriteriaFor(reportCategory: string | null | undefined, sheet: CriteriaSheet = 'performance') {
  return dataStore.evaluationCriterion.findMany({
    where: { isActive: true, category: criteriaCategory(reportCategory), ...sheetWhere(sheet) },
    orderBy: { sortOrder: 'asc' },
  });
}

// The sheet a report is scored on. A report that already has scores on other
// criteria (scored before plans had their own sheet) keeps those criteria, so
// its evaluations stay complete and new scores match them.
export async function fetchCriteriaForReport(
  report: { id: string; reportCategory: string | null; reportType: { name: string } | null },
) {
  const criteria = await fetchCriteriaFor(report.reportCategory, sheetForReportType(report.reportType?.name));
  const scores = await dataStore.evaluationScore.findMany({
    where: { evaluation: { reportId: report.id } },
    select: { criterionId: true },
  });
  const scoredIds = [...new Set(scores.map((score) => score.criterionId))];
  const known = new Set(criteria.map((criterion) => criterion.id));
  if (scoredIds.length === 0 || scoredIds.every((id) => known.has(id))) return criteria;
  return dataStore.evaluationCriterion.findMany({ where: { id: { in: scoredIds } }, orderBy: { sortOrder: 'asc' } });
}

// Validates admin edits of a criterion. With `partial`, missing fields are
// skipped; otherwise name, category and maxScore are all required.
export function parseCriterionFields(
  data: Record<string, unknown>,
  { partial = false } = {},
): { fields: { name?: string; category?: string; maxScore?: number } } | { error: string } {
  const fields: { name?: string; category?: string; maxScore?: number } = {};
  if (data.name !== undefined || !partial) {
    const name = typeof data.name === 'string' ? data.name.trim() : '';
    if (!name) return { error: 'Шалгуурын нэр оруулна уу' };
    if (name.length > 500) return { error: 'Шалгуурын нэр хэт урт байна' };
    fields.name = name;
  }
  if (data.category !== undefined || !partial) {
    if (typeof data.category !== 'string' || !REPORT_CATEGORIES.includes(data.category)) {
      return { error: 'Төслийн ангилал буруу байна' };
    }
    fields.category = data.category;
  }
  if (data.maxScore !== undefined || !partial) {
    const maxScore = Number(data.maxScore);
    if (!Number.isInteger(maxScore) || maxScore < 1 || maxScore > 100) {
      return { error: 'Авбал зохих оноо 1-100 хооронд бүхэл тоо байна' };
    }
    fields.maxScore = maxScore;
  }
  return { fields };
}
