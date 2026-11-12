import type { Attachment } from '@shared/reports/attachments';
import type { ConclusionRow } from '@shared/reports/conclusions';
import type { SignedReportSection } from '@shared/reports/revisions';
import type { CompanyPoint } from '@shared/map/types';
import type { EvaluationCriterion, Report, ReportLocation, ReportType } from '@shared/db/models';

// Page views of the evaluator area. Keys are view paths under /api/views.

// One row of an evaluator's report list: only what the list renders. Dates
// are ISO strings, as the list component takes them.
export type EvaluatorReportRow = {
  id: string;
  reportNumber: string;
  reportType: Pick<ReportType, 'id' | 'name' | 'slug'>;
  title: string;
  submittedAt: string | null;
  status: string;
  finalScore: number | null;
  senderCompany: { name: string } | null;
  location: Pick<ReportLocation, 'province' | 'district'> | null;
};

// A report assigned to the evaluator, with their own assignment's state.
export type EvaluatorAssignedRow = EvaluatorReportRow & {
  assignmentStatus: 'pending' | 'submitted';
  dueDate: string | null;
};

// The report being scored, as the scoring page shows it.
export type EvaluatorScoringReport = Pick<
  Report,
  | 'id'
  | 'reportNumber'
  | 'title'
  | 'implementerName'
  | 'implementerRegister'
  | 'approvedDate'
  | 'submittedAt'
  | 'year'
  | 'description'
  | 'reportCategory'
  | 'status'
  | 'hasGreenery'
  | 'treeCount'
  | 'spentAmount'
> & {
  reportType: Pick<ReportType, 'name' | 'slug'>;
  senderCompany: { name: string } | null;
  location: Pick<ReportLocation, 'latitude' | 'longitude' | 'addressDetail'> | null;
};

// The evaluator's own evaluation of the report (never other evaluators').
// The stored signature value is not part of it.
export type EvaluatorOwnEvaluation = {
  status: string;
  comment: string | null;
  signatureStatus: string;
  signedAt: Date | null;
  signatureId: string | null;
  scores: { criterionId: string; score: number; note: string | null }[];
};

export type EvaluatorScoringView =
  // The report is not assigned to this evaluator.
  | { assigned: false }
  | {
      assigned: true;
      report: EvaluatorScoringReport;
      deadline: Date | null;
      evaluation: EvaluatorOwnEvaluation | null;
      criteria: Pick<EvaluationCriterion, 'id' | 'name' | 'maxScore' | 'sortOrder' | 'sheet'>[];
      // Every file of the report, with short-lived links.
      attachments: Attachment[];
      // The criteria the evaluator can point at when returning the report.
      sections: SignedReportSection[];
      // Whether the report's status allows scoring now.
      scorable: boolean;
    };

export interface EvaluatorViews {
  // /evaluator (assigned reports; ?type=<report type slug> narrows them)
  evaluator: { activeTypeName: string | null; reports: EvaluatorAssignedRow[] };
  // /evaluator/evaluated
  'evaluator/evaluated': { reports: EvaluatorReportRow[] };
  // /evaluator/evaluate/[id]
  'evaluator/evaluate/:id': EvaluatorScoringView;
  // /evaluator/conclusions (search filters in the query)
  'evaluator/conclusions': { rows: ConclusionRow[] };
  // /evaluator/geography
  'evaluator/geography': { points: CompanyPoint[] };
}
