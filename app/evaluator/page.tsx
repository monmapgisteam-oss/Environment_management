import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

// Only the reports the manager distributed to THIS staff member, optionally
// narrowed to a single report type (sidebar sub-item).
async function fetchAssignedReports(evaluatorUserId: string, typeSlug?: string) {
  const assignments = await prisma.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      ...(typeSlug ? { report: { reportType: { slug: typeSlug } } } : {}),
    },
    include: {
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  return assignments.map((assignment: any) => ({
    id: assignment.report.id,
    reportNumber: assignment.report.reportNumber,
    reportType: assignment.report.reportType,
    title: assignment.report.title,
    submittedAt: assignment.report.submittedAt?.toISOString() || null,
    status: assignment.status === 'submitted' ? 'completed' : 'in_review',
    finalScore: assignment.report.finalScore,
    senderCompany: assignment.report.senderCompany,
    location: assignment.report.location,
  }));
}

export default async function EvaluatorDashboard({ searchParams }: { searchParams: { type?: string } }) {
  const user = await getCurrentUser();
  // A staff member must be logged in to see their assigned reports.
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  const [reportTypes, reports] = await Promise.all([
    fetchReportTypes(),
    fetchAssignedReports(user.id, searchParams.type),
  ]);

  const sidebarChildren = reportTypes.map((rt: any) => ({
    label: rt.name,
    href: `/evaluator?type=${rt.slug}`,
    active: searchParams.type === rt.slug,
  }));

  const activeTypeName = searchParams.type
    ? reportTypes.find((rt: any) => rt.slug === searchParams.type)?.name
    : null;

  return (
    <div className="min-h-screen bg-background">
      <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            {
              label: 'Надад оноогдсон тайлангууд',
              href: '/evaluator',
              active: true,
              children: sidebarChildren,
            },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Надад оноогдсон тайлангууд</h2>
            <p className="text-sm text-slate-600">
              {activeTypeName ? `${activeTypeName} төрлийн тайлангууд.` : 'Танд оноогдсон бүх тайлан.'}
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Надад оноогдсон тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Үнэлгээ өгөөгүй тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'in_review').length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Үнэлгээ өгсөн тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'completed').length}</p>
            </div>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-sky-100">
              <p className="text-sm text-slate-400">
                {activeTypeName
                  ? `${activeTypeName} төрлийн оноогдсон тайлан алга байна.`
                  : 'Танд оноогдсон тайлан одоогоор алга байна.'}
              </p>
            </div>
          ) : (
            <ReportTable reports={reports} role="staff" showStatusFilter={false} />
          )}
        </main>
      </div>
    </div>
  );
}
