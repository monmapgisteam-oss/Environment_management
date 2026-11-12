import dataStore from '@/lib/db';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';
import { senderTableRow } from './tableRows';

// Drafts are private to the company that is writing them.
async function fetchDraftReports(companyId: string) {
  return dataStore.report.findMany({
    where: { status: 'draft', senderCompanyId: companyId, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export default defineView({
  name: 'sender/drafts',
  roles: ['sender'],
  async load({ user }) {
    const reports = user.companyId ? await fetchDraftReports(user.companyId) : [];
    return { reports: reports.map(senderTableRow) };
  },
});
