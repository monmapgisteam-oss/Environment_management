import PageHeader from '@/components/layout/PageHeader';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { loadView } from '@/lib/api/server';

export default async function ReviewerGeographyPage() {
  const { points } = await loadView('reviewer/geography');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газарзүйн мэдээлэл" subtitle="Хянагдсан байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан." />

      <div
        className="overflow-hidden border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="reviewer" />
      </div>
    </main>
  );
}
