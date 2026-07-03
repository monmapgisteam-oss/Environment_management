import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';

async function fetchSenderReports() {
  return prisma.report.findMany({
    where: { status: { not: 'draft' } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
}

export default async function SenderReportsPage() {
  const reports = await fetchSenderReports();

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Хяналтын самбар', href: '/sender' },
          {
            label: 'Тайлан илгээх',
            href: '/sender/submit',
            children: [
              { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
              { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
            ],
          },
          { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
          { label: 'Миний тайлангууд', href: '/sender/reports', active: true },
          { label: 'Газарзүйн мэдээлэл', href: '/sender/geography' },
          { label: 'Ноорог', href: '/sender/drafts' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />

        <main className="flex-1 min-w-0 space-y-6 p-5 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Миний тайлангууд</h1>
          </div>

          <ReportTable
            role="sender"
            reports={reports.map((report: any) => ({
              id: report.id,
              reportNumber: report.reportNumber,
              reportType: report.reportType,
              title: report.title,
              submittedAt: report.submittedAt?.toISOString() || null,
              status: report.status,
              // Hidden until the manager sends the signed scan, even once fully scored.
              finalScore: report.signedScanUrl ? report.finalScore : null,
              senderCompany: report.senderCompany,
              location: report.location,
            }))}
          />
        </main>
      </div>
    </div>
  );
}
