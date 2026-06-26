import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { HiInbox, HiUserGroup, HiClock, HiCheckCircle } from 'react-icons/hi';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchReviewerReports() {
  const reports = await prisma.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: { status: { not: 'draft' } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return reports;
}

export default async function ReviewerDashboard() {
  const reports = await fetchReviewerReports();
  const assignedCount = reports.filter((report: any) => report.assignments.length > 0).length;

  const totalCount = reports.length;
  const unassignedCount = reports.filter((r: any) => r.assignments.length === 0).length;
  const inReviewCount = reports.filter((r: any) => r.status === 'in_review').length;
  const completedCount = reports.filter((r: any) => r.status === 'completed').length;
  const averageScore = reports.filter((r: any) => r.finalScore != null).length
    ? (reports.filter((r: any) => r.finalScore != null).reduce((sum: number, r: any) => sum + (r.finalScore ?? 0), 0) / reports.filter((r: any) => r.finalScore != null).length).toFixed(1)
    : '-';

  const reportTypes = await fetchReportTypes();

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
            { label: 'Хяналтын самбар', href: '/reviewer', active: true },
            {
              label: 'Ирсэн тайлангууд',
              href: '/reviewer/reports',
              children: sidebarChildren,
            },
            { label: 'Гишүүдэд оноох', href: '/reviewer/assign' },
            { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
            { label: 'Буцаасан тайлан', href: '/reviewer' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Хяналтын самбар</h2>
          </div>

          <section className="grid gap-3 grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><HiInbox size={16} /></div>
                <span className="text-xs text-slate-500">Ирсэн нийт</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><HiUserGroup size={16} /></div>
                <span className="text-xs text-slate-500">Оноогоогүй</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{unassignedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><HiClock size={16} /></div>
                <span className="text-xs text-slate-500">Хянагдаж байгаа</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{inReviewCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><HiCheckCircle size={16} /></div>
                <span className="text-xs text-slate-500">Үнэлгээ дууссан</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{completedCount}</p>
            </div>
          </section>

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
      </div>
    </div>
  );
}
