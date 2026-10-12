import dataStore from '@/lib/arcgis/data';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import SurveyLookup from '@/components/SurveyLookup';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export default async function ReviewerSurveyPage() {
  const reportTypes = await fetchReportTypes();

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Хяналтын самбар', href: '/reviewer' },
          { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
          { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
          { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
          { label: 'Тайлан хайх', href: '/reviewer/survey', active: true },
          { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
          { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-4 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Тайлан хайх</h1>
            <p className="text-sm text-slate-500">Байгууллагын регистрийн дугаараар тайлангийн мэдээлэл хайна.</p>
          </div>

          <SurveyLookup />
        </main>
      </div>
    </div>
  );
}
