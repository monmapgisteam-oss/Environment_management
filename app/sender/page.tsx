import Link from 'next/link';
import dataStore from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import PageHeader from '@/components/layout/PageHeader';
import { getCurrentUser } from '@/lib/auth';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { formatDate } from '@/lib/utils';
import {
  HiOutlineArrowRight,
  HiOutlineCalendar,
  HiOutlineCheck,
  HiOutlineTrendingUp,
} from 'react-icons/hi';
import { scoresReleased, senderStatus } from '@/lib/reports/scoreRelease';

const IN_REVIEW = ['submitted', 'assigned', 'in_review', 'return_requested'];
const DONE = ['completed', 'approved'];

// Review flow as four steps, for the small progress dots on each report.
function progressStep(status: string, released: boolean) {
  if (status === 'needs_revision' || status === 'rejected') return { step: 0, tone: 'bg-rose-500' };
  if (DONE.includes(status) && released) return { step: 4, tone: 'bg-teal-600' };
  if (DONE.includes(status) || status === 'in_review') return { step: 3, tone: 'bg-teal-600' };
  if (status === 'assigned') return { step: 2, tone: 'bg-teal-600' };
  return { step: 1, tone: 'bg-teal-600' };
}

async function fetchSenderReports(companyId: string, drafts = false) {
  const reports = await dataStore.report.findMany({
    where: {
      status: drafts ? 'draft' : { not: 'draft' },
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
  const [reports, drafts] = user?.companyId
    ? await Promise.all([fetchSenderReports(user.companyId), fetchSenderReports(user.companyId, true)])
    : [[], []];
  const year = new Date().getFullYear();
  const totalCount = reports.length;
  const inReviewCount = reports.filter((r) => IN_REVIEW.includes(senderStatus(r))).length;
  const revisionCount = reports.filter((r) => r.status === 'needs_revision').length;
  const doneCount = reports.filter((r) => DONE.includes(senderStatus(r))).length;
  // A report's score stays hidden from the sender until the manager signs the
  // scores off, even once every staff member has finished scoring it.
  const visibleScores = reports.filter((r) => r.finalScore != null && scoresReleased(r));
  const averageScore = visibleScores.length
    ? (visibleScores.reduce((sum: number, r) => sum + (r.finalScore ?? 0), 0) / visibleScores.length).toFixed(1)
    : null;

  // This year's two obligations: the annual plan and the performance report.
  const thisYear = reports.filter((r) => r.year === year);
  const plan = thisYear.find((r) => r.reportType.name.includes('Жилийн'));
  const performance = thisYear.find((r) => r.reportType.name.includes('Биелэлт'));
  const duties = [
    { label: 'Жилийн төлөвлөгөө', report: plan, href: '/sender/submit?type=plan', icon: <HiOutlineCalendar size={20} /> },
    { label: 'Биелэлтийн тайлан', report: performance, href: '/sender/submit?type=performance', icon: <HiOutlineTrendingUp size={20} /> },
  ];

  const kpis = [
    { label: 'Нийт илгээсэн', value: totalCount, note: `${year} оны байдлаар`, accent: 'bg-teal-600' },
    { label: 'Хянагдаж байгаа', value: inReviewCount, note: 'Хянах байгууллагад', accent: 'bg-amber-400' },
    { label: 'Засвар шаардсан', value: revisionCount, note: revisionCount ? 'Засаад дахин илгээнэ үү' : 'Засах тайлан алга', accent: 'bg-rose-500' },
    { label: 'Үнэлгээ дууссан', value: doneCount, note: averageScore ? `Дундаж оноо ${averageScore}` : 'Дүн гараагүй', accent: 'bg-sky-500' },
  ];

  const recent = reports.slice(0, 6);
  // The report to fix first, so the banner can open it directly.
  const toFix = reports.find((r) => r.status === 'needs_revision');
  // Saved drafts, if any, are mentioned under the latest reports.
  const draftCount = drafts.length;

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title="Хяналтын самбар"
        eyebrow={user?.company?.name}
        subtitle={user?.company?.registerNumber ? `РД ${user.company.registerNumber} · ${year} он` : `${year} он`}
        actions={
          <Link
            href="/sender/submit?type=plan"
            className="inline-flex h-10 items-center gap-2 bg-color-primary px-4 text-sm font-semibold text-white shadow-btn transition hover:bg-color-primary-dark"
          >
            <HiOutlineCalendar size={17} />
            Шинэ тайлан илгээх
          </Link>
        }
      />

      {revisionCount > 0 && (
        <div className="flex flex-col gap-3 border-l-4 border-rose-500 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-rose-900">
            <span className="font-semibold">{revisionCount} тайлан</span> засвар шаардаж байна. Засаад дахин илгээнэ үү.
          </p>
          <Link
            href={revisionCount === 1 && toFix ? `/report/${toFix.id}?role=sender` : '/sender/reports'}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800"
          >
            {revisionCount === 1 ? `${toFix?.reportNumber} засах` : 'Засах тайлангууд'} <HiOutlineArrowRight size={15} />
          </Link>
        </div>
      )}

      {/* One strip of four numbers */}
      <section className="grid grid-cols-2 divide-slate-200 border border-slate-200 bg-white shadow-soft md:grid-cols-4 md:divide-x">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="flex gap-4 px-6 py-5">
            <span className={`w-1 shrink-0 ${kpi.accent}`} />
            <div>
              <p className="text-sm font-medium text-slate-500">{kpi.label}</p>
              <p className="mt-1 text-[32px] font-bold leading-none tracking-tight text-slate-900">{kpi.value}</p>
              <p className="mt-2 text-xs text-slate-400">{kpi.note}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Latest reports with a 4-step progress */}
        <div className="border border-slate-200 bg-white shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Сүүлийн тайлангууд</h2>
            <Link href="/sender/reports" className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 hover:underline">
              Бүгдийг харах <HiOutlineArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-14 text-center">
              <p className="text-sm font-medium text-slate-700">Одоогоор илгээсэн тайлан алга.</p>
              <Link href="/sender/submit?type=plan" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:underline">
                Эхний тайлангаа илгээх <HiOutlineArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((report) => {
                const progress = progressStep(report.status, scoresReleased(report));
                return (
                  <li key={report.id}>
                    <Link href={`/report/${report.id}?role=sender`} className="grid items-center gap-4 px-6 py-3.5 transition hover:bg-slate-50 sm:grid-cols-[150px_minmax(0,1fr)_104px_160px]">
                      <span className="font-mono text-sm font-semibold text-slate-900">{report.reportNumber}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">{report.title}</span>
                        <span className="block text-xs text-slate-500">
                          {report.reportType.name} · {formatDate(report.submittedAt)}
                        </span>
                      </span>
                      <span className="flex items-center gap-1" title="Илгээсэн · Оноосон · Үнэлсэн · Дүгнэсэн">
                        {[1, 2, 3, 4].map((step) => (
                          <span key={step} className={`h-1.5 w-5 ${step <= progress.step ? progress.tone : 'bg-slate-200'}`} />
                        ))}
                      </span>
                      <span className="flex sm:justify-end">
                        <StatusBadge status={report.status === 'return_requested' ? 'in_review' : senderStatus(report) === 'approved' ? 'completed' : senderStatus(report)} />
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          {draftCount > 0 && (
            <Link href="/sender/drafts" className="flex items-center justify-between border-t border-slate-200 px-6 py-3 text-sm text-slate-600 hover:bg-slate-50">
              <span>
                Хадгалсан ноорог: <span className="font-semibold text-slate-900">{draftCount}</span>
              </span>
              <HiOutlineArrowRight size={14} className="text-teal-700" />
            </Link>
          )}
        </div>

        <div className="space-y-6">
          {/* This year's obligations */}
          <div className="border border-slate-200 bg-white shadow-soft">
            <div className="border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-slate-900">{year} оны үүрэг</h2>
              <p className="mt-0.5 text-xs text-slate-500">Журмаар жил бүр илгээх хоёр тайлан</p>
            </div>
            <ul className="divide-y divide-slate-100">
              {duties.map((duty) => (
                <li key={duty.label} className="flex items-center gap-3 px-5 py-4">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center ${
                      duty.report ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    {duty.report ? <HiOutlineCheck size={18} /> : duty.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-slate-900">{duty.label}</span>
                    <span className="block text-xs text-slate-500">
                      {duty.report ? `Илгээсэн · ${formatDate(duty.report.submittedAt)}` : 'Илгээгээгүй'}
                    </span>
                  </span>
                  {duty.report ? (
                    <Link href={`/report/${duty.report.id}?role=sender`} className="text-xs font-semibold text-teal-700 hover:underline">
                      Харах
                    </Link>
                  ) : (
                    <Link
                      href={duty.href}
                      className="inline-flex h-8 items-center border border-teal-600 px-3 text-xs font-semibold text-teal-700 transition hover:bg-teal-50"
                    >
                      Илгээх
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

    </main>
  );
}
