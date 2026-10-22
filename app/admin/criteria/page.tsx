import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import CriteriaManager, { type AdminCriterion } from '@/components/admin/CriteriaManager';
import { REPORT_CATEGORIES } from '@/lib/constants';

async function fetchCriteria(): Promise<AdminCriterion[]> {
  const criteria = await dataStore.evaluationCriterion.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { scores: true } } },
  });
  return criteria.map((c) => ({
    id: c.id,
    name: c.name,
    category: c.category,
    maxScore: c.maxScore,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    scoreCount: c._count.scores,
  }));
}

export default async function AdminCriteriaPage() {
  const criteria = await fetchCriteria();
  // One scoring sheet per report category, in the order senders pick them.
  const sheets = REPORT_CATEGORIES.map((category) => ({
    category,
    criteria: criteria.filter((c) => c.category === category),
  }));

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээний шалгуур" subtitle="Хянах ажилтны тайлан үнэлэхэд ашигладаг шалгуурууд. Төрөл бүрийн идэвхтэй шалгуурын нийлбэр 100 оноо байна." />

      <CriteriaManager sheets={sheets} />
    </main>
  );
}
