import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import KpiStrip from '@/components/ui/KpiStrip';
import Panel, { PanelEmpty } from '@/components/ui/Panel';
import StatusBadge from '@/components/ui/StatusBadge';
import AssignButton from '@/components/evaluation/AssignButton';
import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { scoresReleased } from '@/lib/reports/scoreRelease';
import { formatDate } from '@/lib/utils';
import { ACTIVE_USER_WHERE } from '@/lib/auth/accounts';
import { HiOutlineUserGroup } from 'react-icons/hi';

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

// Every evaluator with how many of their assignments still wait for a score.
async function fetchStaffWorkload() {
  const staff = await dataStore.user.findMany({
    where: { role: 'evaluator', ...ACTIVE_USER_WHERE },
    select: { id: true, name: true, evaluatorAssignments: { select: { reportId: true, status: true } } },
    orderBy: { name: 'asc' },
  });
  return staff.map((member) => {
    const open = member.evaluatorAssignments.filter((a) => a.status !== 'submitted');
    const done = member.evaluatorAssignments.filter((a) => a.status === 'submitted');
    return {
      id: member.id,
      name: member.name,
      open: new Set(open.map((a) => a.reportId)).size,
      done: new Set(done.map((a) => a.reportId)).size,
    };
  });
}

// A staff member with nothing waiting: one quiet line, opens their page.
function IdleMemberRow({ member }: { member: { id: string; name: string; done: number } }) {
  return (
    <li>
      <Link href={`/reviewer/staff/${member.id}`} className="flex items-center gap-3 px-5 py-2 transition hover:bg-slate-50">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center bg-slate-100 text-[11px] font-bold text-slate-500">
          {member.name.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{member.name}</span>
        <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{member.done} үнэлсэн</span>
      </Link>
    </li>
  );
}

export default async function ReviewerDashboard() {
  const [reports, staff] = await Promise.all([fetchReviewerReports(), fetchStaffWorkload()]);
  const totalCount = reports.length;
  const unassigned = reports.filter((r) => r.assignments.length === 0 && !['needs_revision', 'rejected', 'completed', 'approved'].includes(r.status));
  const returnRequests = reports.filter((r) => r.status === 'return_requested');
  const inReviewCount = reports.filter((r) => ['assigned', 'in_review', 'return_requested'].includes(r.status)).length;
  const completedCount = reports.filter((r) => ['completed', 'approved'].includes(r.status)).length;
  // Every evaluator has signed their scores; the manager still has to check
  // them and sign them off before the sender sees anything.
  const awaitingApproval = reports.filter((r) => r.status === 'completed' && !scoresReleased(r));
  const busiest = Math.max(1, ...staff.map((s) => s.open));
  // Members with reports waiting for their score, busiest first; the free
  // ones are listed as small chips so the panel stays short.
  const busy = staff.filter((member) => member.open > 0).sort((a, b) => b.open - a.open);
  const idle = staff.filter((member) => member.open === 0);
  const openTotal = staff.reduce((sum, member) => sum + member.open, 0);
  const IDLE_SHOWN = 4;

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title="Хяналтын самбар"
        eyebrow="Хянах байгууллага"
        subtitle="Ирсэн тайлан, оноолт болон үнэлгээний явц"
        actions={
          <Link
            href="/reviewer/assign"
            className="inline-flex h-10 items-center gap-2 bg-color-primary px-4 text-sm font-semibold text-white shadow-btn transition hover:bg-color-primary-dark"
          >
            <HiOutlineUserGroup size={17} />
            Гишүүдэд оноох
          </Link>
        }
      />

      <KpiStrip
        items={[
          { label: 'Ирсэн нийт', value: totalCount, note: `${new Date().getFullYear()} оны байдлаар`, accent: 'bg-teal-600' },
          { label: 'Оноогоогүй', value: unassigned.length, note: unassigned.length ? 'Гишүүдэд оноох шаардлагатай' : 'Бүгд оноогдсон', accent: 'bg-amber-400' },
          { label: 'Хянагдаж байгаа', value: inReviewCount, note: returnRequests.length ? `${returnRequests.length} буцаах хүсэлт` : 'Буцаах хүсэлт алга', accent: 'bg-sky-500' },
          { label: 'Үнэлгээ дууссан', value: completedCount, note: awaitingApproval.length ? `${awaitingApproval.length} тайлан баталгаажуулалт хүлээж байна` : 'Баталгаажуулалт хүлээсэн тайлан алга', accent: 'bg-emerald-500' },
        ]}
      />

      {/* Both columns stretch to the taller one; the last panel of each fills the rest. */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex flex-col gap-6">
          <Panel title="Оноох шаардлагатай" count={unassigned.length} link={{ label: 'Оноох хуудас', href: '/reviewer/assign' }}>
            {unassigned.length === 0 ? (
              <PanelEmpty>Оноогоогүй тайлан алга.</PanelEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {unassigned.slice(0, 5).map((report) => (
                  <li key={report.id} className="grid items-center gap-4 px-5 py-3.5 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                    <Link href={`/report/${report.id}?role=reviewer`} className="font-mono text-sm font-semibold text-slate-900 hover:text-teal-700">
                      {report.reportNumber}
                    </Link>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{report.title}</span>
                      <span className="block text-xs text-slate-500">
                        {report.senderCompany?.name} · {report.reportType.name} · {formatDate(report.submittedAt)}
                      </span>
                    </span>
                    <AssignButton
                      report={{ id: report.id, reportNumber: report.reportNumber, title: report.title }}
                      className="inline-flex h-8 items-center bg-color-primary px-3 text-xs font-semibold text-white hover:bg-color-primary-dark"
                    >
                      Оноох
                    </AssignButton>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Буцаах хүсэлт" count={returnRequests.length} subtitle="Гишүүд дутуу гэж үзсэн тайлангууд" link={{ label: 'Буцаасан тайлан', href: '/reviewer/returned' }}>
            {returnRequests.length === 0 ? (
              <PanelEmpty>Шийдвэрлэх хүсэлт алга.</PanelEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {returnRequests.slice(0, 5).map((report) => (
                  <li key={report.id} className="grid items-center gap-4 px-5 py-3.5 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                    <span className="font-mono text-sm font-semibold text-slate-900">{report.reportNumber}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{report.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {report.returnRequestedBy ? `${report.returnRequestedBy}: ` : ''}
                        {report.returnReason || 'Шалтгаан бичээгүй'}
                      </span>
                    </span>
                    <Link href={`/report/${report.id}?role=reviewer`} className="inline-flex h-8 items-center border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:border-teal-600 hover:text-teal-700">
                      Шийдвэрлэх
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Баталгаажуулалт хүлээж буй" count={awaitingApproval.length} subtitle="Бүх гишүүн гарын үсгээр үнэлсэн, таны гарын үсэг хүлээж байна" className="flex-1">
            {awaitingApproval.length === 0 ? (
              <PanelEmpty>Хүлээгдэж буй тайлан алга.</PanelEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {awaitingApproval.slice(0, 5).map((report) => (
                  <li key={report.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <Link href={`/report/${report.id}?role=reviewer`} className="min-w-0">
                      <span className="block font-mono text-sm font-semibold text-slate-900">{report.reportNumber}</span>
                      <span className="block truncate text-xs text-slate-500">{report.senderCompany?.name}</span>
                    </Link>
                    <StatusBadge status={report.status} />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="flex flex-col">
          <Panel title="Гишүүдийн ачаалал" subtitle="Үнэлгээ хүлээгдэж буй тайлангийн тоо" link={{ label: 'Явц', href: '/reviewer/evaluation-progress' }} className="flex-1">
            {staff.length === 0 ? (
              <PanelEmpty>Бүртгэлтэй гишүүн алга.</PanelEmpty>
            ) : (
              <>
                <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                  {[
                    { label: 'Ажилтай', value: busy.length, tone: 'text-teal-700' },
                    { label: 'Сул', value: idle.length, tone: 'text-slate-900' },
                    { label: 'Хүлээгдэж буй', value: openTotal, tone: openTotal ? 'text-amber-600' : 'text-slate-900' },
                  ].map((stat) => (
                    <div key={stat.label} className="px-4 py-3 text-center">
                      <p className={`text-xl font-bold tabular-nums ${stat.tone}`}>{stat.value}</p>
                      <p className="mt-0.5 text-[11px] text-slate-500">{stat.label}</p>
                    </div>
                  ))}
                </div>

                {busy.length === 0 ? (
                  <PanelEmpty>Үнэлгээ хүлээгдэж буй тайлан алга.</PanelEmpty>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {busy.map((member) => {
                      const heavy = member.open >= 3;
                      return (
                        <li key={member.id}>
                          <Link
                            href={`/reviewer/staff/${member.id}`}
                            className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                          >
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-teal-50 text-xs font-bold text-teal-700">
                              {member.name.trim().charAt(0).toUpperCase() || '?'}
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="flex items-baseline justify-between gap-2">
                                <span className="truncate text-sm font-medium text-slate-800">{member.name}</span>
                                <span className={`shrink-0 text-xs font-semibold tabular-nums ${heavy ? 'text-amber-600' : 'text-slate-700'}`}>
                                  {member.open} хүлээгдэж буй
                                </span>
                              </span>
                              <span className="mt-1.5 block h-1.5 bg-slate-100">
                                <span
                                  className={`block h-full ${heavy ? 'bg-amber-500' : 'bg-teal-600'}`}
                                  style={{ width: `${(member.open / busiest) * 100}%` }}
                                />
                              </span>
                              <span className="mt-1 block text-[11px] text-slate-400">{member.done} тайлан үнэлсэн</span>
                            </span>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}

                {idle.length > 0 && (
                  <div className="border-t border-slate-200">
                    <p className="flex items-center justify-between bg-slate-50 px-5 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Сул гишүүд
                      <span className="tabular-nums text-slate-400">{idle.length}</span>
                    </p>
                    <ul className="divide-y divide-slate-100">
                      {idle.slice(0, IDLE_SHOWN).map((member) => (
                        <IdleMemberRow key={member.id} member={member} />
                      ))}
                    </ul>
                    {idle.length > IDLE_SHOWN && (
                      <details className="group">
                        <summary className="cursor-pointer list-none border-t border-slate-100 px-5 py-2.5 text-xs font-semibold text-teal-700 hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
                          <span className="group-open:hidden">Бусад {idle.length - IDLE_SHOWN} гишүүн</span>
                          <span className="hidden group-open:inline">Хураах</span>
                        </summary>
                        <ul className="divide-y divide-slate-100 border-t border-slate-100">
                          {idle.slice(IDLE_SHOWN).map((member) => (
                            <IdleMemberRow key={member.id} member={member} />
                          ))}
                        </ul>
                      </details>
                    )}
                  </div>
                )}
              </>
            )}
          </Panel>
        </div>
      </section>

    </main>
  );
}
