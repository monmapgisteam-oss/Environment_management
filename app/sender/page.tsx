import dataStore from '@/lib/db';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import ReportTable from '@/components/reports/ReportTable';
import { getCurrentUser } from '@/lib/auth';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { senderSidebarItems } from '@/lib/senderNav';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { HiPaperAirplane, HiClock, HiPencil, HiCheckCircle, HiStar } from 'react-icons/hi';

async function fetchSenderReports(companyId: string) {
  const reports = await dataStore.report.findMany({
    where: {
      status: { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      OR: [{ senderCompanyId: companyId }, { implementerRegister: { not: null } }],
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return (await attachEffectiveSenderCompanies(reports)).filter((report) => report.senderCompany?.id === companyId);
}

export default async function SenderDashboard() {
  const user = await getCurrentUser();
  const reports = user?.companyId ? await fetchSenderReports(user.companyId) : [];
  const totalCount = reports.length;
  const inReviewCount = reports.filter((r: any) => r.status === 'in_review').length;
  const revisionCount = reports.filter((r: any) => r.status === 'needs_revision').length;
  const completedCount = reports.filter((r: any) => r.status === 'approved' || r.status === 'completed').length;
  // A report's score stays hidden from the sender until the manager sends the
  // signed scan, even once every staff member has finished scoring it.
  const visibleScores = reports.filter((r: any) => r.finalScore != null && r.signedScanUrl != null);
  const averageScore = visibleScores.length
    ? (visibleScores.reduce((sum: number, r: any) => sum + (r.finalScore ?? 0), 0) / visibleScores.length).toFixed(1)
    : '-';

  const stats = [
    { label: 'Нийт илгээсэн', value: totalCount, icon: <HiPaperAirplane size={20} />, card: 'border-emerald-100 bg-emerald-50/70', chip: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-600' },
    { label: 'Хянагдаж байгаа', value: inReviewCount, icon: <HiClock size={20} />, card: 'border-orange-100 bg-orange-50/70', chip: 'bg-orange-100 text-orange-500', num: 'text-orange-500' },
    { label: 'Засвар шаардсан', value: revisionCount, icon: <HiPencil size={20} />, card: 'border-red-100 bg-red-50/70', chip: 'bg-red-100 text-red-500', num: 'text-red-500' },
    { label: 'Үнэлгээ дууссан', value: completedCount, icon: <HiCheckCircle size={20} />, card: 'border-violet-100 bg-violet-50/70', chip: 'bg-violet-100 text-violet-600', num: 'text-violet-600' },
    { label: 'Дундаж үнэлгээ', value: averageScore, icon: <HiStar size={20} />, card: 'border-blue-100 bg-blue-50/70', chip: 'bg-blue-100 text-blue-600', num: 'text-blue-600' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={senderSidebarItems('dashboard')} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />

        <main className="flex-1 min-w-0 space-y-8 p-5 sm:p-6 lg:p-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Хяналтын самбар</h1>
          </div>

          <section className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
            {stats.map((stat) => (
              <div key={stat.label} className={`rounded-2xl border p-5 shadow-soft transition hover:shadow-card ${stat.card}`}>
                <div className="flex items-center gap-3">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${stat.chip}`}>{stat.icon}</div>
                  <span className="text-sm font-medium text-slate-600">{stat.label}</span>
                </div>
                <p className={`mt-3 text-3xl font-bold tracking-tight ${stat.num}`}>{stat.value}</p>
              </div>
            ))}
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
