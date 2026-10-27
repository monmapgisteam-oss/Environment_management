import ScanPrintPanel from '@/components/reports/ScanPrintPanel';
import SignatureBadge from '@/components/signature/SignatureBadge';
import { downloadUrl, type Attachment } from '@/lib/reports/attachments';
import { formatDate } from '@/lib/utils';
import type { EvaluationCriterion } from '@/lib/db/models';
import type { EvaluationSummary, ReportDetail, ScoreApproval, ViewerRole } from './types';

type Props = {
  report: ReportDetail;
  criteria: EvaluationCriterion[];
  criterionAttachments: Record<string, Attachment[]>;
  evaluations: EvaluationSummary[];
  viewerRole: ViewerRole;
  isReviewer: boolean;
  allEvaluatorsDone: boolean;
  approval: ScoreApproval | null;
};

// Per-criterion score table with one column per evaluator, followed by their comments.
export default function EvaluationScoresCard({
  report,
  criteria,
  criterionAttachments,
  evaluations,
  viewerRole,
  isReviewer,
  allEvaluatorsDone,
  approval,
}: Props) {
  const locationLabel = [report.location?.province, report.location?.district, report.location?.khoroo, report.location?.addressDetail]
    .filter((v) => v && v !== 'Тодорхойгүй')
    .join(', ');

  return (
    <div className="bg-white border border-slate-200 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <h2 className="text-base font-semibold text-slate-900">Үнэлгээний дүн</h2>
        {isReviewer && allEvaluatorsDone && (
          <ScanPrintPanel
            reportId={report.id}
            signedScanName={report.signedScanName}
            signedScanUploadedAt={report.signedScanUploadedAt ? report.signedScanUploadedAt.toISOString() : null}
            reportNumber={report.reportNumber}
            title={report.title}
            senderCompanyName={report.senderCompany?.name || ''}
            submittedAtLabel={formatDate(report.submittedAt)}
            implementerName={report.implementerName || ''}
            locationLabel={locationLabel}
            criteria={criteria}
            evaluations={evaluations}
            approval={approval}
          />
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">Авбал зохих оноо</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-56">Илгээсэн файл</th>
              {evaluations.map((ev, i) => (
                <th key={i} className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">
                  <div className="flex flex-col items-center gap-1">
                    <span>{ev.evaluatorName}</span>
                    <SignatureBadge
                      status={ev.signatureStatus}
                      signedAt={ev.signedAt}
                      signatureId={ev.signatureId}
                      signerName={ev.evaluatorName}
                      documentHash={ev.documentHash}
                      viewerRole={viewerRole}
                    />
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, index) => (
              <tr key={criterion.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                <td className="py-3 px-4 text-slate-800">{criterion.name}</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-700">{criterion.maxScore}</td>
                <td className="py-3 px-4">
                  {(criterionAttachments[criterion.id] || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {(criterionAttachments[criterion.id] || []).map((file, fileIndex) => (
                        <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-2">
                          <span className="max-w-[130px] truncate text-xs text-slate-600">{file.name}</span>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-color-primary hover:underline">
                            Нээх
                          </a>
                          <a href={downloadUrl(file)} className="text-xs font-semibold text-color-primary hover:underline">
                            Татах
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                {evaluations.map((ev, i) => {
                  const score = ev.scores.find((s) => s.criterionId === criterion.id);
                  return (
                    <td key={i} className="py-3 px-4 text-center align-top">
                      <span className="font-medium text-color-primary">{score ? score.score : '-'}</span>
                      {score?.note && (
                        <p className="mt-1 max-w-[220px] whitespace-pre-wrap text-left text-xs text-slate-500" title="Үндэслэл, тайлбар">
                          {score.note}
                        </p>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 font-bold text-slate-900">Нийт оноо</td>
              <td className="py-3 px-4 text-center font-bold text-slate-900">
                {criteria.reduce((sum, c) => sum + c.maxScore, 0)}
              </td>
              <td className="py-3 px-4"></td>
              {evaluations.map((ev, i) => (
                <td key={i} className="py-3 px-4 text-center font-bold text-color-primary text-lg">
                  {ev.totalScore}
                  {ev.signatureStatus === 'VERIFIED' && <span className="ml-1 text-emerald-600">✓</span>}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comments */}
      {evaluations.some((ev) => ev.comment) && (
        <div className="mt-5 space-y-2">
          <h3 className="text-sm font-semibold text-slate-700">Сэтгэгдлүүд</h3>
          {evaluations.filter((ev) => ev.comment).map((ev, i) => (
            <div key={i} className="bg-slate-50 border border-slate-100 p-3">
              <p className="text-xs font-semibold text-slate-600 mb-0.5">{ev.evaluatorName}</p>
              <p className="text-sm text-slate-700">{ev.comment}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
