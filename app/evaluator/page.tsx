import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchEvaluatorReports() {
  const reports = await prisma.reportAssignment.findMany({
    include: {
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return reports.map((assignment: any) => ({
    id: assignment.report.id,
    reportNumber: assignment.report.reportNumber,
    reportType: assignment.report.reportType,
    title: assignment.report.title,
    submittedAt: assignment.report.submittedAt?.toISOString() || null,
    status: assignment.status === 'submitted' ? 'completed' : 'in_review',
    finalScore: assignment.report.finalScore,
    senderCompany: assignment.report.senderCompany,
    location: assignment.report.location,
  }));
}

export default async function EvaluatorDashboard() {
  const reports = await fetchEvaluatorReports();

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Үнэлэгч" companyName="Хянах байгууллага" unreadCount={1} />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator', active: true },
            { label: 'Тайлан дүгнэх', href: '/evaluator/evaluate' },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator' },
          ]}
        />

        <main className="w-full p-6 lg:pl-0">
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Надад оноогдсон тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Үнэлгээ өгөөгүй тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'in_review').length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Үнэлгээ өгсөн тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'completed').length}</p>
            </div>
          </div>

          <ReportTable reports={reports} />
        </main>
      </div>
    </div>
  );
}
