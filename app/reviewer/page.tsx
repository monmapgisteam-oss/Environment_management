import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import KpiStrip from '@/components/ui/KpiStrip';
import Panel, { PanelEmpty } from '@/components/ui/Panel';
import StatusBadge from '@/components/ui/StatusBadge';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { formatDate } from '@/lib/utils';
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
    where: { role: 'evaluator' },
    select: { id: true, name: true, evaluatorAssignments: { select: { reportId: true, status: true } } },
    orderBy: { name: 'asc' },
  });
  return staff.map((member) => {
    const open = member.evaluatorAssignments.filter((a) => a.status !== 'submitted');
    return { id: member.id, name: member.name, open: new Set(open.map((a) => a.reportId)).size, total: member.evaluatorAssignments.length };
  });
}

export default async function ReviewerDashboard() {
  const [reports, staff] = await Promise.all([fetchReviewerReports(), fetchStaffWorkload()]);
  const totalCount = reports.length;
  const unassigned = reports.filter((r) => r.assignments.length === 0 && !['needs_revision', 'rejected', 'completed', 'approved'].includes(r.status));
  const returnRequests = reports.filter((r) => r.status === 'return_requested');
  const inReviewCount = reports.filter((r) => ['assigned', 'in_review', 'return_requested'].includes(r.status)).length;
  const completedCount = reports.filter((r) => ['completed', 'approved'].includes(r.status)).length;
  // Reports where every assigned evaluator has scored but no signed scan was sent yet.
  const awaitingScan = reports.filter(
    (r) => !r.signedScanUrl && r.assignments.length > 0 && uniqueAssignmentsByEvaluator(r.assignments).every((a) => a.status === 'submitted'),
  );
  const busiest = Math.max(1, ...staff.map((s) => s.open));

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
          { label: 'Үнэлгээ дууссан', value: completedCount, note: awaitingScan.length ? `${awaitingScan.length} тайлан гарын үсэг хүлээж байна` : 'Гарын үсэг хүлээсэн тайлан алга', accent: 'bg-emerald-500' },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
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
                    <Link href="/reviewer/assign" className="inline-flex h-8 items-center bg-color-primary px-3 text-xs font-semibold text-white hover:bg-color-primary-dark">
                      Оноох
                    </Link>
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
        </div>

        <div className="space-y-6">
          <Panel title="Гишүүдийн ачаалал" subtitle="Үнэлгээ хүлээгдэж буй тайлангийн тоо" link={{ label: 'Явц', href: '/reviewer/evaluation-progress' }}>
            {staff.length === 0 ? (
              <PanelEmpty>Бүртгэлтэй гишүүн алга.</PanelEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {staff.map((member) => (
                  <li key={member.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/reviewer/staff/${member.id}`} className="truncate text-sm font-medium text-slate-800 hover:text-teal-700">
                        {member.name}
                      </Link>
                      <span className="shrink-0 text-xs text-slate-500">
                        <span className="font-semibold text-slate-900">{member.open}</span> / {member.total}
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 bg-slate-100">
                      <div className={`h-full ${member.open === 0 ? 'bg-slate-200' : 'bg-teal-600'}`} style={{ width: `${(member.open / busiest) * 100}%` }} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Гарын үсэг хүлээж буй" count={awaitingScan.length} subtitle="Бүх гишүүн үнэлсэн, хуулга илгээгээгүй">
            {awaitingScan.length === 0 ? (
              <PanelEmpty>Хүлээгдэж буй тайлан алга.</PanelEmpty>
            ) : (
              <ul className="divide-y divide-slate-100">
                {awaitingScan.slice(0, 5).map((report) => (
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
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Бүх тайлан</h2>
        <ReportTable
          role="reviewer"
          reports={reports.map((report) => ({
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
      </section>
    </main>
  );
}
