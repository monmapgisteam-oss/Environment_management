import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';
import { forSender } from '../mask';

// Reports of the sender's company: sent ones (drafts = false) or saved drafts.
export async function fetchSenderReports(companyId: string, drafts = false) {
  const reports = await dataStore.report.findMany({
    where: {
      status: drafts ? 'draft' : { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      OR: [{ senderCompanyId: companyId }, { implementerRegister: { not: null } }],
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return (await attachEffectiveSenderCompanies(reports))
    .filter((report) => report.senderCompany?.id === companyId)
    .map(forSender);
}

export default defineView({
  name: 'sender',
  roles: ['sender'],
  async load({ user }) {
    if (!user.companyId) return { reports: [], drafts: [] };
    const [reports, drafts] = await Promise.all([fetchSenderReports(user.companyId), fetchSenderReports(user.companyId, true)]);
    return { reports, drafts };
  },
});
