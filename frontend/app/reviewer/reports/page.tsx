import PageHeader from '@/components/layout/PageHeader';
import ReportTable from '@/components/reports/ReportTable';
import { loadView } from '@/lib/api/server';
import { listTitleNoun, nounForReportType, REPORT_NOUN } from '@shared/reports/terms';

export default async function ReviewerReportsPage(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  const { selectedType, reports } = await loadView('reviewer/reports', { query: searchParams });

  const noun = selectedType ? nounForReportType(selectedType) : REPORT_NOUN;
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
        title={`Ирсэн ${listTitleNoun(selectedType)}`}
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
