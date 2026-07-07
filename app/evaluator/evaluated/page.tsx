import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';

// Reports THIS staff member has already scored (their assignment has an
// evaluation). Not the merely-assigned ones.
async function fetchEvaluatedReports(evaluatorUserId: string) {
  const assignments = await prisma.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      evaluation: { isNot: null },
      report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    },
    include: {
      evaluation: true,
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { submittedAt: 'desc' },
  });

  const reports = await attachEffectiveSenderCompanies(assignments.map((assignment: any) => assignment.report));
  const reportById = new Map(reports.map((report: any) => [report.id, report]));

  return assignments.map((assignment: any) => {
    const report = reportById.get(assignment.report.id) || assignment.report;
    return {
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status: 'completed',
      // Show the score this staff member gave.
      finalScore: assignment.evaluation?.totalScore ?? null,
      senderCompany: report.senderCompany,
      location: report.location,
    };
  });
}

export default async function EvaluatedReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const reports = await fetchEvaluatedReports(user.id);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated', active: true },
            { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
            { label: 'Тайлан хайх', href: '/evaluator/survey' },
            { label: 'Нэмэлт мэдээлэл', href: '/evaluator?type=type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Үнэлгээ өгсөн тайлангууд</h2>
            <p className="text-sm text-slate-600">Таны үнэлгээ өгсөн бүх тайлан.</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-slate-200">
              <p className="text-sm text-slate-400">Та одоогоор ямар ч тайланд үнэлгээ өгөөгүй байна.</p>
            </div>
          ) : (
            <ReportTable reports={reports} role="staff" showStatusFilter={false} />
          )}
        </main>
      </div>
    </div>
  );
}
