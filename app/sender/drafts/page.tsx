import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchDraftReports() {
  return prisma.report.findMany({
    where: { status: 'draft' },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default async function DraftsPage() {
  const reports = await fetchDraftReports();

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/sender' },
            {
              label: 'Тайлан илгээх',
              href: '/sender/submit',
              children: [
                { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
                { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
                { label: 'Дүгнэх хуудас', href: '/sender/submit?type=summary' },
                { label: 'Хяналтын хуудас', href: '/sender/submit?type=control' },
                { label: 'Аймаг, нийслэлийн санал', href: '/sender/submit?type=regional' },
              ],
            },
            { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
            { label: 'Миний тайлангууд', href: '/sender' },
            { label: 'Ноорог', href: '/sender/drafts', active: true },
            { label: 'Үнэлгээний хариу', href: '/sender' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Ноорог</h2>
            <p className="text-sm text-slate-500 mt-1">Хадгалсан ноорог тайлангуудын жагсаалт.</p>
          </div>

          {reports.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-soft">
              <p className="text-sm text-slate-400">Одоогоор хадгалсан ноорог байхгүй байна.</p>
            </div>
          ) : (
            <ReportTable
              role="sender"
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
          )}
        </main>
      </div>
    </div>
  );
}
