import type { Attachment } from '@shared/reports/attachments';
import type { SignedReportSection } from '@shared/reports/revisions';
import type { Company, Evaluation, EvaluationCriterion, EvaluationScore, Report, ReportComment, ReportLocation, ReportType, User } from '@shared/db/models';

// Page views of the report area. Keys are view paths under /api/views.

// Report record with the relations the detail sections render (no
// assignments: what the viewer may see of them comes separately).
export type ReportDetail = Report & {
  reportType: ReportType;
  senderCompany: Company;
  location: ReportLocation | null;
};

// One evaluator's scores as shown on the detail page. Carries safe signature
// verification metadata only — never the raw numeric signature/PIN.
export type EvaluationSummary = Pick<Evaluation, 'totalScore' | 'comment' | 'signatureStatus' | 'signatureId' | 'documentHash'> & {
  evaluatorName: User['name'];
  evaluatorPosition: User['position'];
  // QR code (data URL) linking to the signer's public profile; set for managers only.
  evaluatorQrUrl: string | null;
  scores: EvaluationScore[];
  signedAt: string | null;
};

// The manager's digital-signature approval of all the evaluators' scores.
export type ScoreApproval = {
  name: User['name'];
  position: User['position'];
  // QR code (data URL) linking to the manager's public profile.
  qrUrl: string | null;
  signatureId: string | null;
  approvedAt: string;
};

// Staff member the report was distributed to, with whether they have scored it.
export type AssignedStaffMember = {
  name: User['name'];
  position: User['position'];
  submitted: boolean;
};

// A comment on a general evaluation conclusion.
export type ConclusionComment = Pick<ReportComment, 'id' | 'authorName' | 'authorRole' | 'body'> & { createdAt: string };

// What the manager's approval card needs while the scores wait for sign-off.
export type ScoreApprovalPending = {
  reportId: string;
  reportNumber: string;
  evaluatorCount: number;
  signedEvaluatorCount: number;
  finalScore: number | null;
  ownEvaluationSigned: boolean;
  canApprove: boolean;
};

// /report/:id for the signed-in viewer. A sender gets the report as GET
// /api/reports/:id returns it (no score or "completed" before the manager's
// sign-off) and no evaluations until then; staff only their own evaluation;
// staff names and the manager's controls only for the manager.
export type ReportDetailView = {
  report: ReportDetail;
  criteria: EvaluationCriterion[];
  attachments: Attachment[];
  reportAttachments: Attachment[];
  criterionAttachments: Record<string, Attachment[]>;
  evaluations: EvaluationSummary[];
  // How many evaluations exist that the viewer may know of (the "not scored
  // yet" / "not released yet" notice), even when their scores stay hidden.
  evaluationCount: number;
  // Manager only; empty for everyone else.
  assignedStaff: AssignedStaffMember[];
  assignedCount: number;
  scoredCount: number;
  managerScored: boolean;
  allEvaluatorsDone: boolean;
  approval: ScoreApproval | null;
  approvalPending: ScoreApprovalPending | null;
  // Manager only: the report's criteria to pick from when returning it.
  sections: SignedReportSection[];
  // Sender view only: the manager's signed scan.
  signedScanDownloadUrl: string | null;
  conclusionComments: ConclusionComment[];
};

// A signer on the printed cover.
export type CoverSigner = {
  signedAt: string | null;
  id: string;
  name: string;
  roleLabel: string;
  position: string;
  qrUrl: string;
};

// /report/:id/cover: the report fields the printed cover shows, and its signers.
export type ReportCoverView = {
  report: Pick<
    Report,
    'reportNumber' | 'title' | 'submittedAt' | 'implementerName' | 'implementerRegister' | 'approvedDate' | 'description' | 'finalScore'
  > & {
    reportType: Pick<ReportType, 'name'>;
    senderCompany: Pick<Company, 'name' | 'registerNumber'> | null;
    location: Pick<ReportLocation, 'province' | 'district' | 'khoroo' | 'addressDetail'> | null;
  };
  staff: CoverSigner[];
  manager: CoverSigner | null;
};

// /qr/profile/:id: the public signer card (no contact details).
export type QrProfileView = Pick<User, 'name' | 'role' | 'position' | 'isActive'> & {
  company: { name: string } | null;
  signatureRegistered: boolean;
};

export interface ReportViews {
  // Null when the report does not exist or the viewer may not open it.
  'report/:id': ReportDetailView | null;
  'report/:id/cover': ReportCoverView | null;
  // The signed-in user's own profile QR code (managers and staff only).
  profile: { qrUrl: string | null };
  'qr/profile/:id': QrProfileView;
}
