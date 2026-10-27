import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { getCurrentUser } from '@/lib/auth';
import { fetchSurveyReports } from '@/lib/survey/reports';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { scoresReleased, senderStatus } from '@/lib/reports/scoreRelease';

async function fetchSenderReports(companyId: string) {
  const reports = await dataStore.report.findMany({
    where: {
      status: { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      OR: [{ senderCompanyId: companyId }, { implementerRegister: { not: null } }],
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return (await attachEffectiveSenderCompanies(reports)).filter((report) => report.senderCompany?.id === companyId);
}

export default async function SenderReportsPage() {
  const user = await getCurrentUser();
  const reports = user?.companyId ? await fetchSenderReports(user.companyId) : [];
  const surveyReports = await fetchSurveyReports({
    registers: user?.company?.registerNumber ? [user.company.registerNumber] : [],
  });
  const existingReportNumbers = new Set(reports.map((report) => report.reportNumber));
  const tableReports = [
    ...reports.map((report) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status: senderStatus(report),
      finalScore: scoresReleased(report) ? report.finalScore : null,
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
        detailHref: `/report/${report.id}?role=sender`,
      })),
  ].sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());

  return (

    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Миний төлөвлөгөө, тайлан" />

      <ReportTable
        emptyHint="Илгээсэн тайлан, төлөвлөгөө энд харагдана. Зүүн цэсний «Жилийн төлөвлөгөө» эсвэл «Биелэлтийн тайлан»-аас илгээнэ үү."
        role="sender"
        reports={tableReports}
      />
    </main>
  );
}
