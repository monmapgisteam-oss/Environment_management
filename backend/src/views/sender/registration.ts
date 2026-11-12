import dataStore from '@/lib/db';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';
import { loadConclusion } from './conclusionData';

// The registration page of a sender whose company the admin has not approved
// (yet): the conclusion sent with the registration, to fix and send again,
// and the admin's and managers' comments on it.
export default defineView({
  name: 'registration',
  roles: ['sender'],
  onlyUnapprovedCompany: true,
  async load({ user }) {
    const company = user.company;
    const report = company
      ? await dataStore.report.findFirst({
          where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
          include: { location: true },
          orderBy: { createdAt: 'asc' },
        })
      : null;
    if (!report) return { report: null, comments: [], file: null };
    return loadConclusion(report);
  },
});
