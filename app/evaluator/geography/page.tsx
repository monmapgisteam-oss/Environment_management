import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import { fetchReviewedCompanyPoints } from '@/lib/reviewedLocations';

export default async function EvaluatorGeographyPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const points = await fetchReviewedCompanyPoints();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Удирдлагын хуудас', href: '/evaluator' },
          { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
          { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
          { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography', active: true },
          { label: 'Нэмэлт мэдээлэл', href: '/evaluator?type=type-5' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
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
            <CompanyMapSection points={points} detailRole="staff" />
          </div>
        </main>
      </div>
    </div>
  );
}
