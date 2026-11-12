import type { EvaluationCriterion, ReportType } from '@shared/db/models';
import type { Payload } from '@shared/db/types';
import type { CompanyPoint } from '@shared/map/types';
import type { Attachment } from '@shared/reports/attachments';
import type { ConclusionRow } from '@shared/reports/conclusions';
import type { PendingCompany } from '@shared/reports/pendingCompany';

// Page views of the reviewer area (the review manager's portal). Keys are view
// paths under /api/views.

// A received report with its type, company (the effective one for imported
// reports) and location.
export type ReviewerReportRow = Payload<'report', { include: { reportType: true; senderCompany: true; location: true } }>;

// A dashboard report: also whether its assignees are members or the manager.
export type ReviewerDashboardReport = ReviewerReportRow & {
  assignments: { evaluator: { role: string } }[];
};

// An evaluator with how many reports still wait for their score.
export type StaffWorkload = { id: string; name: string; open: number; done: number };

export type AssignStaff = {
  id: string;
  name: string;
  position: string | null;
  email: string;
  phone: string | null;
  assignedCount: number;
};

export type AssignReport = {
  id: string;
  reportNumber: string;
  title: string;
  reportTypeName: string;
  senderName: string;
  status: string;
  assignees: { id: string; name: string }[];
};

// An assignment as the progress table needs it: who, by when, and whether
// they have signed. No scores, comments or signatures.
export type ProgressAssignment = {
  evaluatorUserId: string;
  deadline: Date | null;
  assignedAt: Date;
  submittedAt: Date | null;
  evaluator: { id: string; name: string; role: string };
  evaluation: { status: string; signatureStatus: string; signedAt: Date | null; submittedAt: Date } | null;
};

export type ProgressReport = ReviewerReportRow & { assignments: ProgressAssignment[] };

// The manager's own scoring sheet as saved so far (no raw signature).
export type OwnEvaluation = {
  comment: string | null;
  status: string;
  signatureStatus: string;
  signedAt: Date | null;
  signatureId: string | null;
  scores: { criterionId: string; score: number; note: string | null }[];
};

export type EvaluateReport = {
  id: string;
  reportNumber: string;
  title: string;
  reportCategory: string | null;
  reportType: { name: string; slug: string };
  senderCompany: { name: string };
  location: { latitude: number | null; longitude: number | null } | null;
  hasGreenery: boolean | null;
  treeCount: number | null;
  spentAmount: number | null;
};

export type ReviewerEvaluateView =
  // Missing, or not one the manager may open.
  | { state: 'missing' }
  // The manager cannot score it (now): the reason.
  | { state: 'blocked'; report: { id: string; reportNumber: string }; scoringError: string }
  | {
      state: 'ready';
      report: EvaluateReport;
      // Set when scoring is closed (the sheet shows read-only).
      scoringError: string | null;
      criteria: Pick<EvaluationCriterion, 'id' | 'name' | 'maxScore' | 'sortOrder' | 'sheet'>[];
      // The report's files with signed download links.
      attachments: Attachment[];
      ownEvaluation: OwnEvaluation | null;
      // Scores of members who have signed theirs.
      otherEvaluations: { evaluatorName: string; totalScore: number; scores: { criterionId: string; score: number }[] }[];
    };

export type StaffMemberProfile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  company: { name: string } | null;
  evaluatorAssignments: {
    id: string;
    status: string;
    deadline: Date | null;
    report: { id: string; reportNumber: string; title: string; status: string };
    evaluation: { totalScore: number } | null;
  }[];
};

export interface ReviewerViews {
  // /reviewer (dashboard)
  reviewer: { reports: ReviewerDashboardReport[]; staff: StaffWorkload[]; pendingCompanies: number };
  // /reviewer/reports?type=<slug>
  'reviewer/reports': { selectedType: ReportType | null; reports: ReviewerReportRow[] };
  // /reviewer/returned
  'reviewer/returned': { reports: ReviewerReportRow[] };
  // /reviewer/assign
  'reviewer/assign': { staff: AssignStaff[]; reports: AssignReport[] };
  // /reviewer/evaluate/:id
  'reviewer/evaluate/:id': ReviewerEvaluateView;
  // /reviewer/evaluation-progress
  'reviewer/evaluation-progress': { reports: ProgressReport[] };
  // /reviewer/staff/:id (null member: not an evaluator)
  'reviewer/staff/:id': { member: StaffMemberProfile | null; qrUrl: string };
  // /reviewer/conclusions?year=…
  'reviewer/conclusions': { rows: ConclusionRow[]; pending: PendingCompany[] };
  // /reviewer/geography
  'reviewer/geography': { points: CompanyPoint[] };
}
