import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { HiInbox, HiUserGroup, HiClock, HiCheckCircle } from 'react-icons/hi';

async function fetchReviewerReports() {
  const reports = await dataStore.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: { status: { not: 'draft' }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default async function ReviewerDashboard() {
  const reports = await fetchReviewerReports();
  const totalCount = reports.length;
  const unassignedCount = reports.filter((r: any) => r.assignments.length === 0).length;
  const inReviewCount = reports.filter((r: any) => r.status === 'in_review').length;
  const completedCount = reports.filter((r: any) => r.status === 'completed').length;

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Хяналтын самбар</h1>
        <p className="mt-1.5 text-sm text-slate-500">Ирсэн тайлан, оноолт болон үнэлгээний нэгтгэл</p>
      </div>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: 'Ирсэн нийт', value: totalCount, icon: <HiInbox size={20} />, card: 'border-emerald-100 bg-emerald-50/70', chip: 'bg-emerald-100 text-emerald-600', num: 'text-emerald-600' },
          { label: 'Оноогоогүй', value: unassignedCount, icon: <HiUserGroup size={20} />, card: 'border-blue-100 bg-blue-50/70', chip: 'bg-blue-100 text-blue-600', num: 'text-blue-600' },
          { label: 'Хянагдаж байгаа', value: inReviewCount, icon: <HiClock size={20} />, card: 'border-orange-100 bg-orange-50/70', chip: 'bg-orange-100 text-orange-500', num: 'text-orange-500' },
          { label: 'Үнэлгээ дууссан', value: completedCount, icon: <HiCheckCircle size={20} />, card: 'border-violet-100 bg-violet-50/70', chip: 'bg-violet-100 text-violet-600', num: 'text-violet-600' },
        ].map((stat) => (
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
  );
}
