import { formatScore } from '@shared/utils';
import type { Attachment } from '@shared/reports/attachments';
import type { EvaluationCriterion } from '@shared/db/models';
import EvaluationScoresCard from './EvaluationScoresCard';
import type { EvaluationSummary, ReportDetail, ScoreApproval, ViewerRole } from './types';

type Props = {
  report: ReportDetail;
  criteria: EvaluationCriterion[];
  criterionAttachments: Record<string, Attachment[]>;
  evaluations: EvaluationSummary[];
  // Evaluations that exist, also when their scores are hidden (and not sent).
  evaluationCount?: number;
  viewerRole: ViewerRole;
  isReviewer: boolean;
  allEvaluatorsDone: boolean;
  scoresVisible: boolean;
  approval: ScoreApproval | null;
};

// Score table, the "not scored / not released yet" notice and the final average.
export default function EvaluationSection({ report, evaluations, evaluationCount = evaluations.length, scoresVisible, ...cardProps }: Props) {
  // The final score is the average of the signature-verified evaluations,
  // falling back to the stored score when none are verified yet.
  const signedVerifiedScores = evaluations
    .filter((ev) => ev.signatureStatus === 'VERIFIED')
    .map((ev) => ev.totalScore);
  const displayFinalScore = signedVerifiedScores.length
    ? Math.round((signedVerifiedScores.reduce((sum, score) => sum + score, 0) / signedVerifiedScores.length) * 10) / 10
    : report.finalScore;

  return (
    <>
      {/* Evaluation Scores Table */}
      {evaluations.length > 0 && scoresVisible && (
        <EvaluationScoresCard report={report} evaluations={evaluations} {...cardProps} />
      )}

      {/* No evaluation yet, or (sender) not yet released by the manager. A
          report sent back for fixing says nothing here; the notice on top
          already tells the sender what to do. */}
      {(evaluationCount === 0 || !scoresVisible) && report.status !== 'needs_revision' && (
        <div className="bg-white border border-slate-200 p-6 text-center">
          <p className="text-sm text-slate-500">
            {evaluationCount === 0
              ? 'Үнэлгээ одоогоор өгөгдөөгүй байна.'
              : 'Тайлан хянагдаж байна. Менежер баталгаажуулсны дараа үнэлгээний дүн харагдана.'}
          </p>
        </div>
      )}

      {/* Final Score */}
      {displayFinalScore !== null && scoresVisible && (
        <div className="bg-white border border-slate-200 p-6 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-600">Эцсийн дундаж оноо</p>
          <p className="text-3xl font-bold text-color-primary">{formatScore(displayFinalScore)}</p>
        </div>
      )}
    </>
  );
}
