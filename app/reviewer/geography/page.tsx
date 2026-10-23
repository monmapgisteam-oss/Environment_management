import PageHeader from '@/components/layout/PageHeader';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { fetchReviewedCompanyPoints } from '@/lib/map/reviewedLocations';

export default async function ReviewerGeographyPage() {
  const points = await fetchReviewedCompanyPoints();

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
