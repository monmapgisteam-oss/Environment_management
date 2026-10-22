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
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Үнэлгээний шалгуур</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Хянах ажилтны тайлан үнэлэхэд ашигладаг шалгуурууд. Төрөл бүрийн идэвхтэй шалгуурын нийлбэр 100 оноо байна.
        </p>
      </div>

      <CriteriaManager sheets={sheets} />
    </main>
  );
}
