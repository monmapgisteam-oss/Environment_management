import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GeographyMapSection from '@/components/GeographyMapSection';
import ArcgisWebMap from '@/components/ArcgisWebMap';
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
              Хянагдсан байгууллагуудын байршил. Цэг дээр дарж тухайн байгууллагын судалгааны
              мэдээллийг харна уу.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ height: 460 }}
          >
            <GeographyMapSection points={points} />
          </div>

          <div className="space-y-1 pt-2">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">ArcGIS газрын зураг</h2>
            <p className="text-sm text-slate-500">ArcGIS Online дээр үүсгэсэн вэб газрын зураг.</p>
          </div>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ height: 560 }}>
            <ArcgisWebMap webmapId={process.env.NEXT_PUBLIC_ARCGIS_WEBMAP_ID} />
          </div>
        </main>
      </div>
    </div>
  );
}
