import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchAllReports(typeSlug?: string) {
  return prisma.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: {
      status: { not: 'draft' },
      ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export default async function ReviewerReportsPage({ searchParams }: { searchParams: { type?: string } }) {
  const [reportTypes, reports] = await Promise.all([
    fetchReportTypes(),
    fetchAllReports(searchParams.type),
  ]);

  const sidebarChildren = reportTypes.map((rt: any) => ({
    label: rt.name,
    href: `/reviewer/reports?type=${rt.slug}`,
    active: searchParams.type === rt.slug,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/reviewer' },
            {
              label: 'Ирсэн тайлангууд',
              href: '/reviewer/reports',
              active: true,
              children: sidebarChildren,
            },
            { label: 'Гишүүдэд оноох', href: '/reviewer/assign' },
            { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
            { label: 'Буцаасан тайлан', href: '/reviewer' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ирсэн тайлангууд</h2>
            <p className="text-sm text-slate-600">
              {searchParams.type
                ? reportTypes.find((rt: any) => rt.slug === searchParams.type)?.name + ' төрлийн тайлангууд'
                : 'Бүх ирсэн тайлангуудын жагсаалт.'}
            </p>
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
      </div>
    </div>
  );
}
