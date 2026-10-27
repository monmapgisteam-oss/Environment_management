import dataStore from '@/lib/db';
import { isCompanyApproved } from '@/lib/auth/accounts';
import { isDocumentAttachment, parseAttachments } from '@/lib/reports/attachments';
import {
  CONCLUSION_TYPES,
  GENERAL_EVALUATION_CONCLUSION_TITLE,
  filterConclusions,
  type ConclusionRow,
  type ConclusionSearchParams,
} from '@/lib/reports/conclusions';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { signAttachments } from '@/lib/db/storage';

// `includePending` (review managers) also lists conclusions of companies that
// signed up but wait for the admin, so they can check and comment early.
export async function fetchConclusionRows(search: ConclusionSearchParams = {}, { includePending = false } = {}) {
  const reports = await dataStore.report.findMany({
    where: {
      status: { not: 'draft' },
      title: GENERAL_EVALUATION_CONCLUSION_TITLE,
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });

  // Otherwise conclusions of companies the admin has not approved yet stay
  // hidden; rejected companies are never listed.
  const attachedReports = (await attachEffectiveSenderCompanies(reports)).filter(
    (report) =>
      isCompanyApproved(report.senderCompany) || (includePending && report.senderCompany?.approvalStatus === 'pending'),
  );
  const rows = await Promise.all(
    attachedReports.map(async (report): Promise<ConclusionRow | null> => {
      const documents = parseAttachments(report.fileUrl).filter(isDocumentAttachment);
      if (documents.length === 0) return null;
      return {
        id: report.id,
        conclusionNumber: report.conclusionNumber || report.reportNumber,
        year: String(report.year || report.submittedAt?.getFullYear() || ''),
        submittedAt: report.submittedAt,
        category: report.reportCategory || '-',
        projectName: report.projectName || report.title,
        senderCompanyName: report.senderCompany?.name || '-',
        implementerName: report.implementerName,
        district: report.location?.district || null,
        conclusionType: report.description || CONCLUSION_TYPES[0],
        status: report.status,
        companyPending: !isCompanyApproved(report.senderCompany),
        attachments: await signAttachments(documents),
      };
    }),
  );

  return filterConclusions(rows.filter((row): row is ConclusionRow => row !== null), search);
}
