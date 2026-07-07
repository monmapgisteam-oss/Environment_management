import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchReturnedReports() {
  const reports = await prisma.report.findMany({
    where: { status: 'needs_revision', title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default async function ReturnedReportsPage() {
  const [reportTypes, reports] = await Promise.all([
    fetchReportTypes(),
    fetchReturnedReports(),
  ]);

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  const tableReports = reports.map((report: any) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    reportType: report.reportType,
    title: report.title,
    submittedAt: report.submittedAt?.toISOString() || null,
    status: report.status,
    finalScore: report.finalScore,
    senderCompany: report.senderCompany,
    location: report.location,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Хяналтын самбар', href: '/reviewer' },
          { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
          { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
          { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
          { label: 'Тайлан хайх', href: '/reviewer/survey' },
          { label: 'Буцаасан тайлан', href: '/reviewer/returned', active: true },
          { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Буцаасан тайлан</h1>
            <p className="text-sm text-slate-600">Илгээгч байгууллага руу засварлуулахаар буцаасан тайлангууд.</p>
          </div>

          {tableReports.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-6 py-16 text-center shadow-soft">
              <p className="text-sm font-medium text-slate-500">Буцаасан тайлан байхгүй байна.</p>
            </div>
          ) : (
            <ReportTable role="reviewer" reports={tableReports} showStatusFilter={false} />
          )}
        </main>
      </div>
    </div>
  );
}
