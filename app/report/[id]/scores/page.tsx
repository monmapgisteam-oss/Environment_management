import dataStore from '@/lib/db';
import { fetchCriteriaFor } from '@/lib/reports/criteria';
import SignatureBadge from '@/components/signature/SignatureBadge';
import { formatScore } from '@/lib/utils';
import { canAccessReport, requireUser } from '@/lib/auth';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchReportDetail(reportId: string) {
  return dataStore.report.findUnique({
    where: { id: reportId },
    select: {
      id: true,
      senderCompanyId: true,
      implementerRegister: true,
      reportCategory: true,
      finalScore: true,
      signedScanUrl: true,
      location: true,
      assignments: {
        include: {
          evaluator: true,
          evaluation: {
            include: {
              scores: {
                include: { criterion: true },
              },
            },
          },
        },
      },
    },
  });
}

// Score-only view opened from "Тайлан хайх" — just the Excel-style scoring
// table (who gave what), without the rest of the report detail page.
export default async function ReportScoresPage(props: Props) {
  const params = await props.params;
  const currentUser = await requireUser();
  const isStaff = currentUser.role === 'evaluator';
  const isReviewer = currentUser.role === 'review_manager';
  const roleParam = isReviewer ? 'reviewer' : isStaff ? 'staff' : 'sender';

  const report = await fetchReportDetail(params.id);

  if (!report || !(await canAccessReport(currentUser, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }
  const criteria = await fetchCriteriaFor(report.reportCategory);

  // Scores stay hidden from the sender until the manager explicitly sends the
  // signed scan — a single (or even every) staff member finishing must not
  // leak scores early. Managers and staff always see what they're allowed to.
  const isSenderView = !isReviewer && !isStaff;
  const scoresVisible = !isSenderView || !!report.signedScanUrl;
  const viewerRole: 'sender' | 'manager' | 'staff' = isReviewer ? 'manager' : isStaff ? 'staff' : 'sender';

  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments);
  const scoreRows = scoresVisible
    ? uniqueAssignments
        .filter((a) => !isStaff || a.evaluator?.id === currentUser.id)
        .map((a) => ({
          evaluatorName: a.evaluator.name,
          totalScore: a.evaluation ? a.evaluation.totalScore : null,
          comment: a.evaluation?.comment ?? null,
          scores: a.evaluation ? a.evaluation.scores : [],
          // Safe verification metadata only — never the raw numeric signature/PIN.
          signatureStatus: a.evaluation?.signatureStatus ?? 'PENDING',
          signedAt: a.evaluation?.signedAt ? a.evaluation.signedAt.toISOString() : null,
          signatureId: a.evaluation?.signatureId ?? null,
          documentHash: a.evaluation?.documentHash ?? null,
        }))
    : [];

  const signedVerifiedScores = scoreRows
    .filter((row) => row.signatureStatus === 'VERIFIED' && row.totalScore !== null)
    .map((row) => row.totalScore as number);
  const displayFinalScore = signedVerifiedScores.length
    ? Math.round((signedVerifiedScores.reduce((sum, score) => sum + score, 0) / signedVerifiedScores.length) * 10) / 10
    : report.finalScore;

  const backHref = isReviewer ? '/reviewer/survey' : isStaff ? '/evaluator/survey' : '/sender';

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      {scoreRows.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-6">
          <h2 className="text-base font-semibold text-slate-900 mb-5">Үнэлгээний дүн</h2>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th rowSpan={2} className="border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12 align-bottom">№</th>
                  <th rowSpan={2} className="border border-slate-200 text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase align-bottom">Гишүүд</th>
                  <th colSpan={criteria.length} className="border border-slate-200 py-2 px-4 text-xs font-bold text-slate-600 uppercase text-center">Үнэлгээ</th>
                  <th rowSpan={2} className="border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-24 align-bottom">Нийлбэр дүн</th>
                  <th rowSpan={2} className="border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-24 align-bottom">Дундаж оноо</th>
                  <th rowSpan={2} className="border border-slate-200 py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-20 align-bottom">Байршил</th>
                </tr>
                <tr className="border-b-2 border-slate-200 bg-slate-50">
                  {criteria.map((criterion) => (
                    <th key={criterion.id} className="border border-slate-200 py-2 px-2 text-[11px] font-semibold text-slate-500 text-center leading-tight">
                      {criterion.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scoreRows.map((row, i) => (
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="border border-slate-200 py-3 px-4 text-slate-600">{i + 1}</td>
                    <td className="border border-slate-200 py-3 px-4 font-medium text-slate-800">
                      <div className="flex flex-col gap-0.5">
                        <span>{row.evaluatorName}</span>
                        <SignatureBadge
                          status={row.signatureStatus}
                          signedAt={row.signedAt}
                          signatureId={row.signatureId}
                          signerName={row.evaluatorName}
                          documentHash={row.documentHash}
                          viewerRole={viewerRole}
                        />
                      </div>
                    </td>
                    {criteria.map((criterion) => {
                      const score = row.scores.find((s) => s.criterionId === criterion.id);
                      return (
                        <td key={criterion.id} className="border border-slate-200 py-3 px-2 text-center font-medium text-color-primary">
                          {score ? score.score : ''}
                        </td>
                      );
                    })}
                    <td className="border border-slate-200 py-3 px-4 text-center font-bold text-slate-900">
                      {row.totalScore ?? ''}
                      {row.signatureStatus === 'VERIFIED' && <span className="ml-1 text-emerald-600">✓</span>}
                    </td>
                    {i === 0 && (
                      <>
                        <td rowSpan={scoreRows.length} className="border border-slate-200 py-3 px-4 text-center align-middle font-bold text-color-primary">
                          {displayFinalScore !== null ? formatScore(displayFinalScore) : '-'}
                        </td>
                        <td rowSpan={scoreRows.length} className="border border-slate-200 py-3 px-4 text-center align-middle">
                          {report.location?.latitude != null && report.location?.longitude != null ? (
                            <a
                              href={`/report/${report.id}/location?role=${roleParam}`}
                              className="font-medium text-color-primary underline underline-offset-2 hover:text-color-primary/80"
                            >
                              map
                            </a>
                          ) : (
                            '-'
                          )}
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {scoreRows.some((row) => row.comment) && (
            <div className="mt-5 space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">Сэтгэгдлүүд</h3>
              {scoreRows.filter((row) => row.comment).map((row, i) => (
                <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                  <p className="text-xs font-semibold text-slate-600 mb-0.5">{row.evaluatorName}</p>
                  <p className="text-sm text-slate-700">{row.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">
            {isSenderView && !scoresVisible
              ? 'Тайлан хянагдаж байна. Менежер баталгаажуулсны дараа үнэлгээний дүн харагдана.'
              : 'Үнэлгээ одоогоор өгөгдөөгүй байна.'}
          </p>
        </div>
      )}

      <div className="flex justify-end">
        <a href={backHref} className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
          Буцах
        </a>
      </div>
    </main>
  );
}
