import PageHeader from '@/components/layout/PageHeader';
import { requireUser } from '@/lib/auth';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import { fetchReviewedCompanyPoints } from '@/lib/map/reviewedLocations';

export default async function EvaluatorGeographyPage() {
  const user = await requireUser('evaluator');

  const points = await fetchReviewedCompanyPoints({ evaluatorUserId: user.id });

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газарзүйн мэдээлэл" subtitle="Хянагдсан байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан." />

      <div
        className="overflow-hidden border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 200px)', minHeight: 480 }}
      >
        <CompanyMapSection points={points} detailRole="staff" />
      </div>
    </main>
  );
}
