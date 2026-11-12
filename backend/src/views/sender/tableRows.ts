import type { SenderReportRow, SenderReportTableRow } from '@shared/views/sender';
import { forSender } from '../mask';

// A report as one row of the sender's report tables, status and score as the
// sender may see them.
export function senderTableRow(report: SenderReportRow): SenderReportTableRow {
  const masked = forSender(report);
  return {
    id: masked.id,
    reportNumber: masked.reportNumber,
    reportType: masked.reportType,
    title: masked.title,
    submittedAt: masked.submittedAt?.toISOString() || null,
    status: masked.status,
    finalScore: masked.finalScore,
    senderCompany: masked.senderCompany,
    location: masked.location,
  };
}
