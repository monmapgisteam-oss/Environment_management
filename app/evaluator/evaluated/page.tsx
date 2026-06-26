import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

// Reports THIS staff member has already scored (their assignment has an
// evaluation). Not the merely-assigned ones.
async function fetchEvaluatedReports(evaluatorUserId: string) {
  const assignments = await prisma.reportAssignment.findMany({
    where: { evaluatorUserId, evaluation: { isNot: null } },
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

  return assignments.map((assignment: any) => ({
    id: assignment.report.id,
    reportNumber: assignment.report.reportNumber,
    reportType: assignment.report.reportType,
    title: assignment.report.title,
    submittedAt: assignment.report.submittedAt?.toISOString() || null,
    status: 'completed',
    // Show the score this staff member gave.
    finalScore: assignment.evaluation?.totalScore ?? null,
    senderCompany: assignment.report.senderCompany,
    location: assignment.report.location,
  }));
}

export default async function EvaluatedReportsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const reports = await fetchEvaluatedReports(user.id);

  return (
    <div className="min-h-screen bg-background">
      <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated', active: true },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Үнэлгээ өгсөн тайлангууд</h2>
            <p className="text-sm text-slate-600">Таны үнэлгээ өгсөн бүх тайлан.</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-sky-100">
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
