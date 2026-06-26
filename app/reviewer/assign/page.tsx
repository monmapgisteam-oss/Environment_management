import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import AssignBoard from '@/components/AssignBoard';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchStaff() {
  const staff = await prisma.user.findMany({
    where: { role: 'evaluator' },
    select: {
      id: true,
      name: true,
      position: true,
      _count: { select: { evaluatorAssignments: true } },
    },
    orderBy: { name: 'asc' },
  });
  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    position: s.position,
    assignedCount: s._count.evaluatorAssignments,
  }));
}

async function fetchDistributableReports() {
  const reports = await prisma.report.findMany({
    where: { status: { in: ['submitted', 'assigned', 'in_review', 'needs_revision'] } },
    include: {
      reportType: true,
      senderCompany: true,
      assignments: { include: { evaluator: { select: { id: true, name: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  return reports.map((report: any) => ({
    id: report.id,
    reportNumber: report.reportNumber,
    title: report.title,
    reportTypeName: report.reportType.name,
    senderName: report.senderCompany?.name || '-',
    status: report.status,
    assignees: report.assignments.map((a: any) => ({ id: a.evaluator.id, name: a.evaluator.name })),
  }));
}

export default async function AssignPage() {
  const [reportTypes, staff, reports] = await Promise.all([
    fetchReportTypes(),
    fetchStaff(),
    fetchDistributableReports(),
  ]);

  const sidebarChildren = reportTypes.map((rt: any) => ({
    label: rt.name,
    href: `/reviewer/reports?type=${rt.slug}`,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/reviewer' },
            { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
            { label: 'Гишүүдэд оноох', href: '/reviewer/assign', active: true },
            { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
            { label: 'Буцаасан тайлан', href: '/reviewer' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Гишүүдэд оноох</h2>
            <p className="text-sm text-slate-600">Ирсэн тайлангуудыг үнэлгээний гишүүдэд хуваарилна.</p>
          </div>

          <AssignBoard reports={reports} staff={staff} />
        </main>
      </div>
    </div>
  );
}
