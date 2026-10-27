import type { ComponentProps } from 'react';
import type SignatureBadge from '@/components/signature/SignatureBadge';
import type { Company, Evaluation, EvaluationScore, Report, ReportLocation, ReportType, User } from '@/lib/db/models';

// Report record with the relations the detail sections render.
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

export type ViewerRole = ComponentProps<typeof SignatureBadge>['viewerRole'];
