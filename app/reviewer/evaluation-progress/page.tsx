import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import EmptyState from '@/components/ui/EmptyState';
import StatusBadge from '@/components/ui/StatusBadge';
import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';
import { formatShortDate } from '@/lib/utils';

async function fetchEvaluationReports() {
  const reports = await dataStore.report.findMany({
    where: {
      status: { in: ['assigned', 'in_review', 'completed'] },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: { include: { evaluator: { select: { id: true, name: true } }, evaluation: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

// Every report being scored: who has signed, who hasn't, and by when. Reports
// waiting for the manager's approval come first.
export default async function EvaluationProgressPage() {
  const reports = await fetchEvaluationReports();
  const now = Date.now();
  const rows = reports
    .map((report) => {
      const evaluators = uniqueAssignmentsByEvaluator(report.assignments).map((assignment) => ({
        name: assignment.evaluator?.name ?? '—',
        signed: assignment.evaluation?.status === 'SIGNED',
        deadline: assignment.deadline,
      }));
      const pending = evaluators.filter((evaluator) => !evaluator.signed);
      const nextDeadline = pending
        .map((evaluator) => evaluator.deadline)
        .filter((deadline): deadline is Date => !!deadline)
        .sort((a, b) => a.getTime() - b.getTime())[0];
      return { report, evaluators, signed: evaluators.length - pending.length, nextDeadline };
    })
    .sort((a, b) => Number(b.report.status === 'completed') - Number(a.report.status === 'completed'));

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Үнэлгээний явц" subtitle="Гишүүдэд оноосон тайлан бүрийн үнэлгээ хэр явж байгаа, хэн үнэлээгүй байгааг харуулна." />

      {rows.length === 0 ? (
        <EmptyState
          title="Үнэлгээ хийгдэж байгаа тайлан алга."
          hint="Тайланг «Ирсэн БОМТ-ууд» хэсгээс гишүүдэд оноосны дараа явц энд харагдана."
        />
      ) : (
        <div className="overflow-x-auto border border-slate-200 bg-white shadow-soft">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Дугаар</th>
                <th className="px-4 py-3">Төсөл, байгууллага</th>
                <th className="px-4 py-3">Гишүүд</th>
                <th className="px-4 py-3 text-center">Үнэлсэн</th>
                <th className="px-4 py-3">Дуусах хугацаа</th>
                <th className="px-4 py-3">Төлөв</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ report, evaluators, signed, nextDeadline }) => {
                const overdue = !!nextDeadline && nextDeadline.getTime() < now;
                return (
                  <tr key={report.id} className="border-b border-slate-100 align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/report/${report.id}?role=reviewer`} className="font-mono font-semibold text-teal-700 hover:underline">
                        {report.reportNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{report.title}</p>
                      <p className="text-xs text-slate-500">
                        {report.senderCompany?.name} · {report.reportType.name}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <ul className="space-y-0.5 text-xs">
                        {evaluators.map((evaluator) => (
                          <li key={evaluator.name} className={evaluator.signed ? 'text-emerald-700' : 'text-slate-500'}>
                            {evaluator.signed ? '✓' : '○'} {evaluator.name}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-800">
                      {signed} / {evaluators.length}
                    </td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'font-semibold text-rose-600' : 'text-slate-600'}`}>
                      {nextDeadline ? `${formatShortDate(nextDeadline)}${overdue ? ' · хоцорсон' : ''}` : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {report.status === 'completed' ? (
                        <Link href={`/report/${report.id}?role=reviewer`} className="text-xs font-semibold text-teal-700 hover:underline">
                          Батлах →
                        </Link>
                      ) : (
                        <StatusBadge status={report.status} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
