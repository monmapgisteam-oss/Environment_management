import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { getCurrentUser } from '@/lib/auth';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import {
  HiOutlineArrowRight,
  HiOutlineCalendar,
  HiOutlineCheckCircle,
  HiOutlineClock,
  HiOutlineDocumentDuplicate,
  HiOutlineExclamation,
  HiOutlineFolder,
  HiOutlineMap,
  HiOutlinePaperAirplane,
  HiOutlineStar,
  HiOutlineTrendingUp,
} from 'react-icons/hi';

// Statuses grouped the way the sender follows them. Every status except draft
// falls in exactly one group, so the groups add up to the total.
const STATUS_GROUPS = [
  { key: 'review', label: 'Хянагдаж байгаа', statuses: ['submitted', 'assigned', 'in_review', 'return_requested'], bar: 'bg-amber-400', dot: 'bg-amber-400' },
  { key: 'revision', label: 'Засвар шаардсан', statuses: ['needs_revision'], bar: 'bg-rose-500', dot: 'bg-rose-500' },
  { key: 'completed', label: 'Үнэлгээ дууссан', statuses: ['completed', 'approved'], bar: 'bg-teal-500', dot: 'bg-teal-500' },
  { key: 'rejected', label: 'Татгалзсан', statuses: ['rejected'], bar: 'bg-slate-400', dot: 'bg-slate-400' },
];

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
  const totalCount = reports.length;
  const groups = STATUS_GROUPS.map((group) => ({
    ...group,
    count: reports.filter((r) => group.statuses.includes(r.status)).length,
  }));
  const countOf = (key: string) => groups.find((group) => group.key === key)?.count ?? 0;
  const revisionCount = countOf('revision');
  // A report's score stays hidden from the sender until the manager sends the
  // signed scan, even once every staff member has finished scoring it.
  const visibleScores = reports.filter((r) => r.finalScore != null && r.signedScanUrl != null);
  const averageScore = visibleScores.length
    ? (visibleScores.reduce((sum: number, r) => sum + (r.finalScore ?? 0), 0) / visibleScores.length).toFixed(1)
    : null;
  const share = (count: number) => (totalCount ? Math.round((count / totalCount) * 100) : 0);

  const stats = [
    { label: 'Нийт илгээсэн', value: totalCount, note: `${new Date().getFullYear()} оны байдлаар`, icon: <HiOutlinePaperAirplane size={20} />, chip: 'bg-teal-50 text-teal-600' },
    { label: 'Хянагдаж байгаа', value: countOf('review'), note: `Нийт тайлангийн ${share(countOf('review'))}%`, icon: <HiOutlineClock size={20} />, chip: 'bg-amber-50 text-amber-600' },
    { label: 'Засвар шаардсан', value: revisionCount, note: revisionCount ? 'Засаад дахин илгээнэ үү' : 'Засах тайлан алга', icon: <HiOutlineExclamation size={20} />, chip: 'bg-rose-50 text-rose-600' },
    { label: 'Үнэлгээ дууссан', value: countOf('completed'), note: `Нийт тайлангийн ${share(countOf('completed'))}%`, icon: <HiOutlineCheckCircle size={20} />, chip: 'bg-sky-50 text-sky-600' },
  ];

  const shortcuts = [
    { label: 'Ноорог', note: drafts.length ? `${drafts.length} хадгалсан ноорог` : 'Хадгалсан ноорог алга', href: '/sender/drafts', icon: <HiOutlineDocumentDuplicate size={18} /> },
    { label: 'Миний тайлангууд', note: 'Илгээсэн бүх тайлан', href: '/sender/reports', icon: <HiOutlineFolder size={18} /> },
    { label: 'Газарзүйн мэдээлэл', note: 'Төслийн байршлууд', href: '/sender/geography', icon: <HiOutlineMap size={18} /> },
  ];

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      {/* Title and the two main submit actions */}
      <PageHeader
        title="Хяналтын самбар"
        eyebrow={user?.company?.name}
        subtitle="Тайлангуудын явцыг эндээс хянана."
        actions={
          <>
          <Link
            href="/sender/submit?type=performance"
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <HiOutlineTrendingUp size={17} className="text-slate-400" />
            Биелэлтийн тайлан
          </Link>
          <Link
            href="/sender/submit?type=plan"
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-color-primary px-4 text-sm font-semibold text-white shadow-btn transition hover:bg-color-primary-dark"
          >
            <HiOutlineCalendar size={17} />
            Жилийн төлөвлөгөө илгээх
          </Link>
          </>
        }
      />

      {revisionCount > 0 && (
        <div className="flex flex-col gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-rose-600">
              <HiOutlineExclamation size={18} />
            </span>
            <p className="text-sm text-rose-900">
              <span className="font-semibold">{revisionCount} тайлан</span> засвар шаардаж байна. Засаад дахин илгээнэ үү.
            </p>
          </div>
          <Link href="/sender/reports" className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-700 hover:text-rose-800">
            Тайлангууд руу очих <HiOutlineArrowRight size={15} />
          </Link>
        </div>
      )}

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-soft">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-500">{stat.label}</span>
              <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.chip}`}>{stat.icon}</span>
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{stat.value}</p>
            <p className="mt-1 text-xs text-slate-400">{stat.note}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Status breakdown */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <h2 className="text-base font-semibold text-slate-900">Тайлангийн төлөв</h2>
            <span className="text-sm text-slate-400">Нийт {totalCount}</span>
          </div>
          {totalCount === 0 ? (
            <div className="mt-6 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center">
              <p className="text-sm text-slate-500">Одоогоор илгээсэн тайлан алга.</p>
              <Link href="/sender/submit?type=plan" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-teal-700 hover:text-teal-800">
                Эхний тайлангаа илгээх <HiOutlineArrowRight size={15} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-5 flex h-3 overflow-hidden bg-slate-100">
                {groups
                  .filter((group) => group.count > 0)
                  .map((group) => (
                    <div key={group.key} className={group.bar} style={{ width: `${(group.count / totalCount) * 100}%` }} />
                  ))}
              </div>
              <ul className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {groups.map((group) => (
                  <li key={group.key} className="rounded-xl bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                      <span className={`h-2 w-2 rounded-full ${group.dot}`} />
                      {group.label}
                    </div>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {group.count}
                      <span className="ml-1.5 text-xs font-normal text-slate-400">{share(group.count)}%</span>
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {/* Average score and shortcuts */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-teal-600 to-emerald-600 p-5 text-white shadow-soft">
            <div className="flex items-center gap-2 text-sm font-medium text-teal-50">
              <HiOutlineStar size={18} />
              Дундаж үнэлгээ
            </div>
            <p className="mt-2 text-3xl font-bold tracking-tight">{averageScore ?? '—'}</p>
            <p className="mt-1 text-xs text-teal-50/80">
              {visibleScores.length ? `${visibleScores.length} тайлангийн дүнгээр` : 'Үнэлгээний дүн гараагүй байна'}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-2 shadow-soft">
            {shortcuts.map((shortcut) => (
              <Link
                key={shortcut.href}
                href={shortcut.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-slate-50"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 group-hover:bg-teal-50 group-hover:text-teal-600">
                  {shortcut.icon}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-slate-800">{shortcut.label}</span>
                  <span className="block truncate text-xs text-slate-400">{shortcut.note}</span>
                </span>
                <HiOutlineArrowRight size={15} className="text-slate-300 group-hover:text-teal-600" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Илгээсэн тайлангууд</h2>
        <ReportTable
          role="sender"
          reports={reports.map((report) => ({
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
      </section>
    </main>
  );
}
