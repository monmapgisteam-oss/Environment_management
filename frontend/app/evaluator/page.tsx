import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { listTitleNoun, nounForReportType } from '@shared/reports/terms';
import KpiStrip from '@/components/ui/KpiStrip';
import Panel, { PanelEmpty } from '@/components/ui/Panel';
import EmptyState from '@/components/ui/EmptyState';
import { formatDate } from '@shared/utils';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';
import ReportTable from '@/components/reports/ReportTable';

export default async function EvaluatorDashboard(props: { searchParams: Promise<{ type?: string }> }) {
  const searchParams = await props.searchParams;
  // A staff member must be logged in to see their assigned reports.
  const user = await requireUser('evaluator');

  // Only the reports the manager distributed to THIS staff member, optionally
  // narrowed to a single report type (sidebar sub-item).
  const { activeTypeName, reports } = await loadView('evaluator', { query: searchParams });
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
