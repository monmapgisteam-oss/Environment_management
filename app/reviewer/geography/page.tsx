import CompanyMapSection from '@/components/map/CompanyMapSection';
import { fetchReviewedCompanyPoints } from '@/lib/map/reviewedLocations';

export default async function ReviewerGeographyPage() {
  const points = await fetchReviewedCompanyPoints();

  return (
    <main className="flex-1 min-w-0 space-y-4 p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Газарзүйн мэдээлэл</h1>
        <p className="text-sm text-slate-500">
          Хянагдсан байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан.
        </p>
      </div>

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="reviewer" />
      </div>
    </main>
  );
}
