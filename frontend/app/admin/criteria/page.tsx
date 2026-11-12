import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import CriteriaManager from '@/components/admin/CriteriaManager';
import { REPORT_CATEGORIES } from '@shared/constants';

export default async function AdminCriteriaPage() {
  const { criteria } = await loadView('admin/criteria');
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

  // Criteria with no known category belong to no sheet, so no one scores them.
  const uncategorised = criteria.filter((c) => !c.category || !REPORT_CATEGORIES.includes(c.category));

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээний шалгуур" subtitle="Хянах ажилтны үнэлэхэд ашигладаг шалгуурууд. Төслийн ангилал бүр Жилийн төлөвлөгөө (БОМТ) ба Биелэлтийн тайлангийн тусдаа дүгнэх хуудастай; хуудас бүрийн идэвхтэй шалгуурын нийлбэр 100 оноо байна." />

      {uncategorised.length > 0 && (
        <section className="border border-amber-300 bg-amber-50 p-5">
          <h2 className="text-sm font-semibold text-amber-900">Ангилалгүй шалгуур ({uncategorised.length})</h2>
          <p className="mt-1 text-xs text-amber-800">
            Эдгээр шалгуур ямар ч дүгнэх хуудсанд харагдахгүй. Хуучин шалгуурыг &quot;Үйлдвэрлэл&quot; ангилалд оноохын тулд{' '}
            <code className="bg-white px-1">npm run setup</code> ажиллуулна уу.
          </p>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-900">
            {uncategorised.map((c) => (
              <li key={c.id}>{c.name}</li>
            ))}
          </ul>
        </section>
      )}

      <CriteriaManager sheets={sheets} />
    </main>
  );
}
