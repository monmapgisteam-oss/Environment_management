import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchAdminReports() {
  const reports = await prisma.report.findMany({
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return reports;
}

export default async function AdminDashboard() {
  const reports = await fetchAdminReports();

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Систем админ" companyName="Системийн удирдлага" unreadCount={1} />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/admin' },
            { label: 'Компаниуд', href: '/admin' },
            { label: 'Хэрэглэгчид', href: '/admin' },
            { label: 'Бүх тайлан', href: '/admin' },
            { label: 'Бүх үнэлгээ', href: '/admin' },
            { label: 'Тайлангийн төрөл', href: '/admin' },
            { label: 'Үнэлгээний шалгуур', href: '/admin' },
            { label: 'Тохиргоо', href: '/admin' },
          ]}
        />

        <main className="w-full p-6 lg:pl-0">
          <div className="grid gap-6 md:grid-cols-3 mb-6">
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Нийт тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Батлагдсан тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'approved').length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Татгалзсан тайлан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'rejected').length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Үнэлгээ дууссан</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{reports.filter((r: any) => r.status === 'completed').length}</p>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft border border-sky-100">
              <p className="text-sm text-slate-500">Дундаж оноо</p>
              <p className="mt-4 text-3xl font-semibold text-navy">{ reports.filter((r: any) => r.finalScore != null).length ? (reports.filter((r: any) => r.finalScore != null).reduce((sum: number, r: any) => sum + (r.finalScore ?? 0), 0) / reports.filter((r: any) => r.finalScore != null).length).toFixed(1) : '-' }</p>
            </div>
          </div>

          <ReportTable reports={reports.map((report: any) => ({
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
