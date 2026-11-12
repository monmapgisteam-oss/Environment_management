import type { Payload } from '@shared/db/types';
import type { EvaluatorReportRow } from '@shared/views/evaluator';

type ListedReport = Payload<'report', { include: { reportType: true; senderCompany: true; location: true } }>;

// The fields of a report an evaluator's list renders, with its status and
// score as the page decided them.
export function reportRow(report: ListedReport, status: string, finalScore: number | null): EvaluatorReportRow {
  return {
    id: report.id,
    reportNumber: report.reportNumber,
    reportType: { id: report.reportType.id, name: report.reportType.name, slug: report.reportType.slug },
    title: report.title,
    submittedAt: report.submittedAt?.toISOString() || null,
    status,
    finalScore,
    senderCompany: report.senderCompany ? { name: report.senderCompany.name } : null,
    location: report.location ? { province: report.location.province, district: report.location.district } : null,
  };
}
