import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { listTitleNoun, nounForReportType, REPORT_NOUN } from '@/lib/reports/terms';

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

export default async function ReviewerReportsPage(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  const reportTypes = await fetchReportTypes();
  const selectedType = searchParams.type
    ? reportTypes.find((rt) => rt.slug === searchParams.type)
    : undefined;
  const reports = await fetchAllReports(searchParams.type);

  const noun = selectedType ? nounForReportType(selectedType.name) : REPORT_NOUN;
  const tableReports = reports.map((report) => ({
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
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title={`Ирсэн ${listTitleNoun(selectedType?.name)}`}
        subtitle={
          selectedType
            ? `${selectedType.name} төрлийн ${noun.many}`
            : 'Бүх ирсэн тайлангуудын жагсаалт.'
        }
      />

      <ReportTable role="reviewer" reports={tableReports} noun={noun} />
    </main>
  );
}
