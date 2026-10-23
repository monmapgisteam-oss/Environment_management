import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchEvaluationReports() {
  const reports = await dataStore.report.findMany({
    where: { status: 'completed', title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
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

export default async function EvaluationProgressPage() {
  const reports = await fetchEvaluationReports();

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээний явц" subtitle="Хянагдаж байгаа болон үнэлгээ дууссан тайлангуудын жагсаалт." />

      <ReportTable
        emptyHint="Гишүүдэд оноосон тайлангийн үнэлгээний явц энд харагдана. Тайланг «Ирсэн БОМТ-ууд» хэсгээс гишүүдэд оноогоорой."
        role="reviewer"
        reports={reports.map((report) => ({
          id: report.id,
          reportNumber: report.reportNumber,
          reportType: report.reportType,
          title: report.title,
          submittedAt: report.submittedAt?.toISOString() || null,
          status: report.status,
          finalScore: report.finalScore,
          senderCompany: report.senderCompany,
          location: report.location,
        }))}
      />
    </main>
  );
}
