import PageHeader from '@/components/layout/PageHeader';
import { loadView } from '@/lib/api/server';
import CompanyMapSection from '@/components/map/CompanyMapSection';

export default async function AdminMapPage() {
  // Every report location that has coordinates, with its company and review outcome.
  const { points: allPoints } = await loadView('admin/map');

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газрын зураг" subtitle="Байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан." />

      <div
        className="overflow-hidden border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}
      >
        <CompanyMapSection points={allPoints} />
      </div>
    </main>
  );
}
