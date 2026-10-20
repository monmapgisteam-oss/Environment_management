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
