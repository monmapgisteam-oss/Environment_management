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
    sheet: c.sheet,
    maxScore: c.maxScore,
    sortOrder: c.sortOrder,
    isActive: c.isActive,
    scoreCount: c._count.scores,
  }));
}

export default async function AdminCriteriaPage() {
  const criteria = await fetchCriteria();
  // Per report category, in the order senders pick them: the plan sheet
  // (Жилийн төлөвлөгөө) and the performance sheet (Биелэлтийн тайлан).
  const sheets = REPORT_CATEGORIES.flatMap((category) =>
    (['plan', 'performance'] as const).map((sheet) => ({
      key: `${sheet}:${category}`,
      category,
      sheet,
      title: sheet === 'plan' ? 'Жилийн төлөвлөгөө (БОМТ)' : 'Биелэлтийн тайлан',
      criteria: criteria.filter(
        (c) => c.category === category && (sheet === 'plan' ? c.sheet === 'plan' : c.sheet !== 'plan'),
      ),
    })),
  );

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээний шалгуур" subtitle="Хянах ажилтны үнэлэхэд ашигладаг шалгуурууд. Төслийн ангилал бүр Жилийн төлөвлөгөө (БОМТ) ба Биелэлтийн тайлангийн тусдаа дүгнэх хуудастай; хуудас бүрийн идэвхтэй шалгуурын нийлбэр 100 оноо байна." />

      <CriteriaManager sheets={sheets} />
    </main>
  );
}
