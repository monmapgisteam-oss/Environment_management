import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { listTitleNoun, nounForReportType } from '@/lib/reports/terms';
import KpiStrip from '@/components/ui/KpiStrip';
import Panel, { PanelEmpty } from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@/lib/utils';
import dataStore from '@/lib/db';
import { requireUser } from '@/lib/auth';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

// Only the reports the manager distributed to THIS staff member, optionally
// narrowed to a single report type (sidebar sub-item).
async function fetchAssignedReports(evaluatorUserId: string, typeSlug?: string) {
  const assignments = await dataStore.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      report: {
        title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
        ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
      },
    },
    include: {
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const reports = await attachEffectiveSenderCompanies(assignments.map((assignment) => assignment.report));
  const reportById = new Map(reports.map((report) => [report.id, report]));

  const seenReportIds = new Set<string>();
  return assignments.filter((assignment) => {
    if (seenReportIds.has(assignment.report.id)) return false;
    seenReportIds.add(assignment.report.id);
    return true;
  }).map((assignment) => {
    const report = reportById.get(assignment.report.id) || assignment.report;
    // Surface the report's own state for return flows so the staff member sees
    // "Буцаах хүсэлт илгээгдсэн" after they ask the manager to return it (and
    // "Засвар шаардсан" if the manager actually returned it to the sender).
    // Otherwise derive the status from whether they have submitted their score.
    const reportStatus = report.status;
    const status =
      reportStatus === 'return_requested' || reportStatus === 'needs_revision'
        ? reportStatus
        : assignment.status === 'submitted'
          ? 'completed'
          : 'in_review';
    return {
      assignmentStatus: assignment.status,
      dueDate: assignment.deadline ? assignment.deadline.toISOString() : null,
      id: report.id,
      reportNumber: report.reportNumber,
      reportType: report.reportType,
      title: report.title,
      submittedAt: report.submittedAt?.toISOString() || null,
      status,
      finalScore: report.finalScore,
      senderCompany: report.senderCompany,
      location: report.location,
    };
  });
}

export default async function EvaluatorDashboard(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  // A staff member must be logged in to see their assigned reports.
  const user = await requireUser('evaluator');

  const [reportTypes, reports] = await Promise.all([
    fetchReportTypes(),
    fetchAssignedReports(user.id, searchParams.type),
  ]);

  const activeTypeName = searchParams.type
    ? reportTypes.find((rt) => rt.slug === searchParams.type)?.name
    : null;
  const noun = nounForReportType(activeTypeName);

  const queue = reports.filter((r) => r.assignmentStatus !== 'submitted' && r.status !== 'needs_revision');
  const scored = reports.filter((r) => r.assignmentStatus === 'submitted').length;
  const returnRequested = reports.filter((r) => r.status === 'return_requested').length;
  const today = new Date();
  const overdue = queue.filter((r) => r.dueDate && new Date(r.dueDate) < today).length;
  const dueLabel = (due: string | null) => {
    if (!due) return 'Хугацаа заагаагүй';
    const days = Math.ceil((new Date(due).getTime() - today.getTime()) / 86_400_000);
    if (days < 0) return `${-days} өдөр хэтэрсэн`;
    if (days === 0) return 'Өнөөдөр дуусна';
    return `${days} өдөр үлдсэн`;
  };
  const tableRows = reports.map(({ assignmentStatus, dueDate, ...row }) => row);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader
        title={`Надад оноогдсон ${listTitleNoun(activeTypeName)}`}
        eyebrow={user.name}
        subtitle={activeTypeName ? `${activeTypeName} төрлийн ${noun.many}` : 'Хянах менежерээс танд оноосон тайлангууд'}
      />

      <KpiStrip
          items={[
            { label: 'Оноогдсон нийт', value: reports.length, note: `${new Date().getFullYear()} оны байдлаар`, accent: 'bg-teal-600' },
            { label: 'Үнэлгээ өгөх', value: queue.length, note: overdue ? `${overdue} нь хугацаа хэтэрсэн` : 'Хугацаандаа', accent: overdue ? 'bg-rose-500' : 'bg-amber-400' },
            { label: 'Үнэлсэн', value: scored, note: 'Гарын үсгээр баталгаажсан', accent: 'bg-emerald-500' },
            { label: 'Буцаах хүсэлт', value: returnRequested, note: 'Менежерийн шийдвэр хүлээж байна', accent: 'bg-sky-500' },
          ]}
        />

      <Panel title="Үнэлгээ хүлээж буй" count={queue.length} subtitle="Хугацааны дарааллаар" link={{ label: `Үнэлсэн ${noun.many}`, href: '/evaluator/evaluated' }}>
          {queue.length === 0 ? (
            <PanelEmpty>Үнэлэх {noun.one} алга. Шинэ {noun.one} оноогдоход мэдэгдэл ирнэ.</PanelEmpty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {[...queue]
                .sort((a, b) => (a.dueDate ? new Date(a.dueDate).getTime() : Infinity) - (b.dueDate ? new Date(b.dueDate).getTime() : Infinity))
                .slice(0, 6)
                .map((report) => {
                  const late = !!report.dueDate && new Date(report.dueDate) < today;
                  return (
                    <li key={report.id} className="grid items-center gap-4 px-5 py-3.5 sm:grid-cols-[140px_minmax(0,1fr)_150px_auto]">
                      <span className="font-mono text-sm font-semibold text-slate-900">{report.reportNumber}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-slate-800">{report.title}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {report.senderCompany?.name} · {report.reportType.name} · {formatDate(report.submittedAt)}
                        </span>
                      </span>
                      <span className={`text-xs font-medium ${late ? 'text-rose-600' : 'text-slate-500'}`}>{dueLabel(report.dueDate)}</span>
                      <Link href={`/evaluator/evaluate/${report.id}`} className="inline-flex h-8 items-center bg-color-primary px-3 text-xs font-semibold text-white hover:bg-color-primary-dark">
                        Үнэлэх
                      </Link>
                    </li>
                  );
                })}
            </ul>
          )}
        </Panel>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Бүх оноогдсон {noun.one}</h2>
        {reports.length === 0 ? (
          <EmptyState
            title={activeTypeName ? `${activeTypeName} төрлийн оноогдсон ${noun.one} алга байна.` : 'Танд оноогдсон тайлан одоогоор алга байна.'}
            hint={`Хянах менежер ${noun.one} оноосны дараа энд харагдана.`}
          />
        ) : (
          <ReportTable reports={tableRows} role="staff" showStatusFilter={false} noun={noun} />
        )}
      </section>
    </main>
  );
}
