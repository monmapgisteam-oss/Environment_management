import type { Report, ReportType } from '@/lib/db/models';
import { createSignedUrl } from '@/lib/db/storage';
import { parseAttachments, type Attachment } from '@/lib/reports/attachments';
import { fetchCriteriaFor } from '@/lib/reports/criteria';
import { reportSections, type ReportSection } from '@/lib/reports/revisions';

// Upload sections of a stored report with their files (server only).
export async function loadReportSections(report: Pick<Report, 'reportCategory' | 'fileUrl'> & { reportType: Pick<ReportType, 'name'> | null }) {
  // Evidence rows of the submit form follow the performance sheet.
  const criteria = await fetchCriteriaFor(report.reportCategory, 'performance');
  return reportSections({
    reportType: report.reportType?.name,
    reportCategory: report.reportCategory,
    criteria,
    attachments: parseAttachments(report.fileUrl),
  });
}

export type SignedSectionFile = Attachment & { viewUrl: string };
export type SignedReportSection = Omit<ReportSection, 'files'> & { files: SignedSectionFile[] };

// Sections with a short-lived link for each file; `url` stays the stored
// reference so a form can say which files to keep.
export async function signSections(sections: ReportSection[]): Promise<SignedReportSection[]> {
  return Promise.all(
    sections.map(async (section) => ({
      ...section,
      files: await Promise.all(section.files.map(async (file) => ({ ...file, viewUrl: await createSignedUrl(file.url) }))),
    })),
  );
}
