import { redirect } from 'next/navigation';
import dataStore from '@/lib/arcgis/data';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import SurveyLookup from '@/components/SurveyLookup';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export default async function EvaluatorSurveyPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const reportTypes = await fetchReportTypes();
  const additionalType = reportTypes.find((rt: any) => rt.name.includes('Нэмэлт'));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          {
            label: 'Надад оноогдсон тайлангууд',
            href: '/evaluator',
            children: reportTypes
              .filter((rt: any) => !rt.name.includes('Нэмэлт'))
              .map((rt: any) => ({ label: rt.name, href: `/evaluator?type=${rt.slug}` })),
          },
          { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
          { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
          { label: 'Тайлан хайх', href: '/evaluator/survey', active: true },
          ...(additionalType
            ? [{ label: 'Нэмэлт мэдээлэл', href: `/evaluator?type=${additionalType.slug}` }]
            : []),
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
        <main className="flex-1 min-w-0 space-y-4 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Тайлан хайх</h1>
            <p className="text-sm text-slate-500">Байгууллагын регистрийн дугаараар тайлангийн мэдээлэл хайна.</p>
          </div>

          <SurveyLookup role="staff" />
        </main>
      </div>
    </div>
  );
}
