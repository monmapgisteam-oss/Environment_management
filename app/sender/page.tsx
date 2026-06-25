import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import ReportTable from '@/components/ReportTable';
import { HiPaperAirplane, HiClock, HiPencil, HiCheckCircle, HiStar } from 'react-icons/hi';

async function fetchSenderReports() {
  const reports = await prisma.report.findMany({
    where: { status: { not: 'draft' } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return reports;
}

export default async function SenderDashboard() {
  const reports = await fetchSenderReports();
  const totalCount = reports.length;
  const inReviewCount = reports.filter((r: any) => r.status === 'in_review').length;
  const revisionCount = reports.filter((r: any) => r.status === 'needs_revision').length;
  const completedCount = reports.filter((r: any) => r.status === 'approved' || r.status === 'completed').length;
  const averageScore = reports.filter((r: any) => r.finalScore != null).length
    ? (reports.filter((r: any) => r.finalScore != null).reduce((sum: number, r: any) => sum + (r.finalScore ?? 0), 0) / reports.filter((r: any) => r.finalScore != null).length).toFixed(1)
    : '-';

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/sender', active: true },
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
            { label: 'Ноорог', href: '/sender/drafts' },
            { label: 'Үнэлгээний хариу', href: '/sender' },
          ]}
        />

        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Хяналтын самбар</h2>
          </div>

          <section className="grid gap-3 grid-cols-3 xl:grid-cols-5">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600"><HiPaperAirplane size={16} /></div>
                <span className="text-xs text-slate-500">Нийт илгээсэн</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{totalCount}</p>
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
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-500"><HiPencil size={16} /></div>
                <span className="text-xs text-slate-500">Засвар шаардсан</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{revisionCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><HiCheckCircle size={16} /></div>
                <span className="text-xs text-slate-500">Үнэлгээ дууссан</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{completedCount}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-soft">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><HiStar size={16} /></div>
                <span className="text-xs text-slate-500">Дундаж үнэлгээ</span>
              </div>
              <p className="mt-2 text-2xl font-semibold text-slate-900">{averageScore}</p>
            </div>
          </section>

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
        </main>
      </div>
    </div>
  );
}
