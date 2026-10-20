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
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Үнэлгээний явц</h2>
        <p className="text-sm text-slate-600">Хянагдаж байгаа болон үнэлгээ дууссан тайлангуудын жагсаалт.</p>
      </div>

      <ReportTable
        role="reviewer"
        reports={reports.map((report: any) => ({
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
