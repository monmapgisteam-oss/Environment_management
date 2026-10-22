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

export async function fetchCriteriaFor(reportCategory: string | null | undefined) {
  return dataStore.evaluationCriterion.findMany({
    where: { isActive: true, category: criteriaCategory(reportCategory) },
    orderBy: { sortOrder: 'asc' },
  });
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
      return { error: 'Тайлангийн төрөл буруу байна' };
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
