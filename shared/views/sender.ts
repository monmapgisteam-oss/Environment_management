import type { Company, Report, ReportComment, ReportType } from '@shared/db/models';
import type { Payload } from '@shared/db/types';
import type { CompanyPoint } from '@shared/map/types';
import type { SignedReportSection } from '@shared/reports/revisions';

// Page views of the sender area. Keys are view paths under /api/views.

// A sender's report row: its type, company (the effective one for imported
// reports) and location. Scores and statuses are as the sender may see them.
export type SenderReportRow = Payload<'report', { include: { reportType: true; senderCompany: true; location: true } }>;

// One row of the sender's report tables (ReportTable), status and score as
// the sender may see them.
export type SenderReportTableRow = {
  id: string;
  reportNumber: string;
  reportType: ReportType;
  title: string;
  submittedAt: string | null;
  status: string;
  finalScore: number | null;
  senderCompany: Company | null;
  location: SenderReportRow['location'];
};

// A reviewer's comment on a general evaluation conclusion.
export type SenderConclusionComment = Pick<ReportComment, 'id' | 'authorName' | 'authorRole' | 'body'> & { createdAt: string };

// A general evaluation conclusion as its edit form shows it.
export type SenderConclusion = {
  report: Pick<Report, 'id' | 'year' | 'conclusionNumber' | 'description' | 'projectName' | 'reportCategory' | 'implementerName'> & {
    location: { district: string } | null;
  };
  comments: SenderConclusionComment[];
  // The conclusion's file with a short-lived link.
  file: { name: string; url: string } | null;
};

// A returned report as the revision page shows it.
export type SenderRevisionReport = Pick<Report, 'id' | 'reportNumber' | 'title' | 'status' | 'returnReason' | 'revisionItems'> & {
  reportType: ReportType;
};

export interface SenderViews {
  // /sender (dashboard)
  sender: { reports: SenderReportRow[]; drafts: SenderReportRow[] };
  // /sender/reports
  'sender/reports': { reports: SenderReportTableRow[] };
  // /sender/drafts
  'sender/drafts': { reports: SenderReportTableRow[] };
  // /sender/conclusions
  'sender/conclusions': { conclusions: SenderConclusion[] };
  // /sender/revise/:id: null when the report is missing or not the sender's;
  // documents only while it waits for the sender's corrections.
  'sender/revise/:id': { report: SenderRevisionReport | null; documents: SignedReportSection[] };
  // /sender/geography
  'sender/geography': { points: CompanyPoint[] };
  // /registration (a sender whose company is not approved yet): the first
  // conclusion, sent with the registration.
  registration: { report: SenderConclusion['report'] | null; comments: SenderConclusionComment[]; file: SenderConclusion['file'] };
}
