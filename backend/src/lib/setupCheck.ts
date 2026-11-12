import dataStore from '@/lib/db';
import { REPORT_CATEGORIES } from '@shared/constants';
import { CORE_TYPE_SLUGS, PLAN_TYPE_SLUG } from '@shared/reports/terms';

export type SetupProblem = { message: string; href: string };

type CriterionRow = { category: string | null; sheet: string | null; maxScore: number; isActive: boolean };

// What the service is missing for the workflow to run, so the admin sees it
// on the dashboard instead of a sender or evaluator hitting it mid-task:
// the two core report types, a scoring sheet for every category and type,
// sheets that don't add up to 100, and criteria with no category.
export function findSetupProblems(
  types: { slug: string; name: string; isActive: boolean }[],
  criteria: CriterionRow[],
): SetupProblem[] {
  const problems: SetupProblem[] = [];
  for (const slug of CORE_TYPE_SLUGS) {
    const label = slug === PLAN_TYPE_SLUG ? 'Жилийн төлөвлөгөө' : 'Биелэлтийн тайлан';
    const type = types.find((candidate) => candidate.slug === slug);
    if (!type) problems.push({ message: `"${label}" тайлангийн төрөл бүртгэгдээгүй байна (npm run setup).`, href: '/admin/settings' });
    else if (!type.isActive) problems.push({ message: `"${type.name}" тайлангийн төрөл идэвхгүй байна.`, href: '/admin/settings' });
  }

  const active = criteria.filter((criterion) => criterion.isActive);
  for (const category of REPORT_CATEGORIES) {
    for (const sheet of ['plan', 'performance'] as const) {
      const rows = active.filter(
        (criterion) =>
          criterion.category === category && (sheet === 'plan' ? criterion.sheet === 'plan' : criterion.sheet !== 'plan'),
      );
      const sheetLabel = sheet === 'plan' ? 'Жилийн төлөвлөгөө' : 'Биелэлтийн тайлан';
      if (rows.length === 0) {
        problems.push({ message: `"${category}" ангиллын ${sheetLabel}-ний шалгуур алга.`, href: '/admin/criteria' });
        continue;
      }
      const total = rows.reduce((sum, criterion) => sum + criterion.maxScore, 0);
      if (total !== 100) {
        problems.push({ message: `"${category}" ангиллын ${sheetLabel}-ний шалгуурын нийт оноо ${total} байна (100 байх ёстой).`, href: '/admin/criteria' });
      }
    }
  }

  const uncategorised = criteria.filter((criterion) => !criterion.category || !REPORT_CATEGORIES.includes(criterion.category));
  if (uncategorised.length > 0) {
    problems.push({ message: `${uncategorised.length} шалгуурт ангилал оноогоогүй байна.`, href: '/admin/criteria' });
  }
  return problems;
}

export async function loadSetupProblems() {
  const [types, criteria] = await Promise.all([
    dataStore.reportType.findMany({ select: { slug: true, name: true, isActive: true } }),
    dataStore.evaluationCriterion.findMany({ select: { category: true, sheet: true, maxScore: true, isActive: true } }),
  ]);
  return findSetupProblems(types, criteria);
}
