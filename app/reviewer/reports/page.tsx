import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import type { ReportType } from '@/lib/db/models';
import { ADDITIONAL_REPORT_TYPE_SLUG, isAdditionalReportType } from '@/lib/nav';
import ReportTable from '@/components/reports/ReportTable';
import { fetchSurveyReports } from '@/lib/survey/reports';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchAllReports(typeSlug?: string) {
  const reports = await dataStore.report.findMany({
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

// Survey123 report type name (normalizeSurveyReportType) for an app type.
function surveyReportTypeName(reportType: Pick<ReportType, 'name'> | undefined) {
  const name = reportType?.name || '';
  if (name.includes('Жилийн')) return 'Төлөвлөгөө';
  if (name.includes('Биелэлт')) return 'Тайлан';
  return null;
}

export default async function ReviewerReportsPage(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  const reportTypes = await fetchReportTypes();
  const selectedType = searchParams.type
    ? reportTypes.find((rt) => rt.slug === searchParams.type)
    : undefined;
  const selectedSurveyType = searchParams.type ? surveyReportTypeName(selectedType) : null;
  const [reports, surveyReports] = await Promise.all([
    fetchAllReports(searchParams.type),
    searchParams.type && !selectedSurveyType
      ? Promise.resolve([])
      : fetchSurveyReports({ reportTypeName: selectedSurveyType }),
  ]);

  const isAdditional =
    searchParams.type === ADDITIONAL_REPORT_TYPE_SLUG || (!!selectedType && isAdditionalReportType(selectedType));
  const existingReportNumbers = new Set(reports.map((report) => report.reportNumber));
  const tableReports = [
    ...reports.map((report) => ({
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

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title={isAdditional ? 'Нэмэлт мэдээлэл' : 'Ирсэн тайлангууд'} subtitle={
          !isAdditional &&
          (searchParams.type
            ? reportTypes.find((rt) => rt.slug === searchParams.type)?.name + ' төрлийн тайлангууд'
            : 'Бүх ирсэн тайлангуудын жагсаалт.')
        }
      />

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
  );
}
