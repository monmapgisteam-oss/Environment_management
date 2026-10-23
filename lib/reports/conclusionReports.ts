import dataStore from '@/lib/db';
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

export async function fetchConclusionRows(search: ConclusionSearchParams = {}) {
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

  const attachedReports = await attachEffectiveSenderCompanies(reports);
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
        attachments: await signAttachments(documents),
      };
    }),
  );

  return filterConclusions(rows.filter((row): row is ConclusionRow => row !== null), search);
}
