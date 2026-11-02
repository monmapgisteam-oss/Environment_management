import type { Report, ReportType } from '@/lib/db/models';
import { createSignedUrl } from '@/lib/db/storage';
import type { Attachment } from '@/lib/reports/attachments';
import { fetchCriteriaFor, sheetForReportType } from '@/lib/reports/criteria';
import { criteriaSections, type ReportSection } from '@/lib/reports/revisions';

// What a reviewer can flag when returning a stored report: the criteria of
// the sheet it is scored on (server only).
export async function loadReturnSections(report: Pick<Report, 'reportCategory'> & { reportType: Pick<ReportType, 'name' | 'slug'> | null }) {
  return criteriaSections(await fetchCriteriaFor(report.reportCategory, sheetForReportType(report.reportType)));
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
