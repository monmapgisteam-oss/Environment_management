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

  return assignments.map((assignment: any) => {
    // Surface the report's own state for return flows so the staff member sees
    // "Буцаах хүсэлт илгээгдсэн" after they ask the manager to return it (and
    // "Засвар шаардсан" if the manager actually returned it to the sender).
    // Otherwise derive the status from whether they have submitted their score.
    const reportStatus = assignment.report.status;
    const status =
      reportStatus === 'return_requested' || reportStatus === 'needs_revision'
        ? reportStatus
        : assignment.status === 'submitted'
          ? 'completed'
          : 'in_review';
    return {
      id: assignment.report.id,
      reportNumber: assignment.report.reportNumber,
      reportType: assignment.report.reportType,
      title: assignment.report.title,
      submittedAt: assignment.report.submittedAt?.toISOString() || null,
      status,
      finalScore: assignment.report.finalScore,
      senderCompany: assignment.report.senderCompany,
      location: assignment.report.location,
    };
  });
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

  // "Нэмэлт мэдээлэл" is shown as its own top-level menu item (below
  // "Үнэлгээ өгсөн тайлангууд"), so it is excluded from the report-type submenu.
  const additionalType = reportTypes.find((rt: any) => rt.name.includes('Нэмэлт'));
  const isAdditional = !!additionalType && searchParams.type === additionalType.slug;

  const sidebarChildren = reportTypes
    .filter((rt: any) => !rt.name.includes('Нэмэлт'))
    .map((rt: any) => ({
      label: rt.name,
      href: `/evaluator?type=${rt.slug}`,
      active: searchParams.type === rt.slug,
    }));

  const activeTypeName = searchParams.type
    ? reportTypes.find((rt: any) => rt.slug === searchParams.type)?.name
    : null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            {
              label: 'Надад оноогдсон тайлангууд',
              href: '/evaluator',
              active: !isAdditional,
              children: sidebarChildren,
            },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
            ...(additionalType
              ? [{ label: 'Нэмэлт мэдээлэл', href: `/evaluator?type=${additionalType.slug}`, active: isAdditional }]
              : []),
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              {isAdditional ? 'Нэмэлт мэдээлэл' : 'Надад оноогдсон тайлангууд'}
            </h2>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-3xl bg-white px-6 py-16 text-center shadow-soft border border-slate-200">
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
