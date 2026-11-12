import dataStore from '@/lib/db';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';
import { loadConclusion } from './conclusionData';

// The company's general evaluation conclusions ("Ерөнхий үнэлгээний
// дүгнэлт"): each one with its file and the reviewers' comments.
export default defineView({
  name: 'sender/conclusions',
  roles: ['sender'],
  async load({ user }) {
    const company = user.company;
    const reports = company
      ? await dataStore.report.findMany({
          where: { senderCompanyId: company.id, title: GENERAL_EVALUATION_CONCLUSION_TITLE },
          include: { location: true },
          orderBy: { createdAt: 'desc' },
        })
      : [];
    return { conclusions: await Promise.all(reports.map(loadConclusion)) };
  },
});
