import dataStore from '@/lib/db';
import { createSignedUrl } from '@/lib/db/storage';
import { parseAttachments } from '@shared/reports/attachments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import type { PendingCompany } from '@shared/reports/pendingCompany';

// Self-registered companies the review manager has to approve, with their contact and
// the conclusion they sent, so the register number can be checked. Rejected
// ones stay listed (after the pending ones) so they can still be approved.
export async function fetchPendingCompanies(): Promise<PendingCompany[]> {
  const companies = await dataStore.company.findMany({
    where: { type: 'sender', approvalStatus: { in: ['pending', 'rejected'] } },
    include: {
      users: { select: { name: true, email: true, phone: true, position: true }, orderBy: { createdAt: 'asc' } },
      reports: {
        where: { title: GENERAL_EVALUATION_CONCLUSION_TITLE },
        select: { id: true, projectName: true, conclusionNumber: true, fileUrl: true },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return Promise.all(
    companies.map(async (company) => {
      const report = company.reports[0];
      const file = report ? parseAttachments(report.fileUrl)[0] : undefined;
      return {
        id: company.id,
        name: company.name,
        registerNumber: company.registerNumber,
        createdAt: new Date(company.createdAt).toISOString(),
        rejected: company.approvalStatus === 'rejected',
        contact: company.users[0] ?? null,
        conclusion:
          report && file
            ? {
                reportId: report.id,
                projectName: report.projectName,
                conclusionNumber: report.conclusionNumber,
                fileName: file.name,
                fileUrl: await createSignedUrl(file.url),
              }
            : null,
      };
    }),
  ).then((rows) => rows.sort((a, b) => Number(a.rejected) - Number(b.rejected)));
}
