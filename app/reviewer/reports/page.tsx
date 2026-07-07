import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { fetchSurveyReports } from '@/lib/surveyReports';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchAllReports(typeSlug?: string) {
  const reports = await prisma.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: {
      status: { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

function surveyReportTypeName(reportType: any | undefined) {
  const name = reportType?.name || '';
  if (name.includes('Жилийн')) return 'Жилийн тайлан';
  if (name.includes('Биелэлт')) return 'Биелэлтийн тайлан';
  return null;
}

export default async function ReviewerReportsPage(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  const reportTypes = await fetchReportTypes();
  const selectedType = searchParams.type
    ? reportTypes.find((rt: any) => rt.slug === searchParams.type)
    : undefined;
  const selectedSurveyType = searchParams.type ? surveyReportTypeName(selectedType) : null;
  const [reports, surveyReports] = await Promise.all([
    fetchAllReports(searchParams.type),
    searchParams.type && !selectedSurveyType
      ? Promise.resolve([])
      : fetchSurveyReports({ reportTypeName: selectedSurveyType }),
  ]);

  const isAdditional = searchParams.type === 'type-5';
  const existingReportNumbers = new Set(reports.map((report: any) => report.reportNumber));
  const tableReports = [
    ...reports.map((report: any) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status: report.status,
      finalScore: report.finalScore,
      senderCompany: report.senderCompany,
      location: report.location,
      source: report.reportNumber?.startsWith('S123-') ? 'survey123' as const : 'web' as const,
    })),
    ...surveyReports
      .filter((report) => !existingReportNumbers.has(report.reportNumber))
      .map((report) => ({
        id: report.id,
        reportNumber: report.reportNumber,
        reportType: report.reportType,
        title: report.title,
        submittedAt: report.submittedAt,
        status: report.status,
        finalScore: report.finalScore,
        senderCompany: report.senderCompany,
        location: report.location,
        source: report.source,
        detailHref: `/report/${report.id}?role=reviewer`,
      })),
  ].sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
      active: searchParams.type === rt.slug,
    }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/reviewer' },
            {
              label: 'Ирсэн тайлангууд',
              href: '/reviewer/reports',
              active: true,
              children: sidebarChildren,
            },
            { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
            { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
            { label: 'Тайлан хайх', href: '/reviewer/survey' },
            { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
            { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5', active: searchParams.type === 'type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isAdditional ? 'Нэмэлт мэдээ' : 'Ирсэн тайлангууд'}
            </h2>
            {!isAdditional && (
              <p className="text-sm text-slate-600">
                {searchParams.type
                  ? reportTypes.find((rt: any) => rt.slug === searchParams.type)?.name + ' төрлийн тайлангууд'
                  : 'Бүх ирсэн тайлангуудын жагсаалт.'}
              </p>
            )}
          </div>

          {isAdditional && tableReports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-slate-200">
              <p className="text-sm text-slate-400">Мэдээлэл ирээгүй байна.</p>
            </div>
          ) : (
            <ReportTable
              role="reviewer"
              showStatusFilter={!isAdditional}
              reports={tableReports}
            />
          )}
        </main>
      </div>
    </div>
  );
}
