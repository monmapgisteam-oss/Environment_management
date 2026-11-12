import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

// Reports members asked to return and reports sent back to the sender.
export default defineView({
  name: 'reviewer/returned',
  roles: ['review_manager'],
  async load() {
    const reports = await dataStore.report.findMany({
      where: { status: { in: ['needs_revision', 'return_requested'] }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
      include: {
        reportType: true,
        senderCompany: true,
        location: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    return { reports: await attachEffectiveSenderCompanies(reports) };
  },
});
