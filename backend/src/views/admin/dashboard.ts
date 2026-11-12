import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { loadSetupProblems } from '@/lib/setupCheck';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

// Every sent report. Senders' unsent drafts are private to them.
async function fetchAdminReports() {
  const reports = await dataStore.report.findMany({
    where: { status: { not: 'draft' }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default defineView({
  name: 'admin',
  roles: ['admin'],
  async load() {
    const [reports, companyCount, userCount, evaluatorCount, setupProblems, pendingCompanies] = await Promise.all([
      fetchAdminReports(),
      dataStore.company.count({ where: { type: 'sender' } }),
      dataStore.user.count({ where: { role: { not: 'admin' } } }),
      dataStore.user.count({ where: { role: 'evaluator' } }),
      loadSetupProblems(),
      dataStore.company.count({ where: { type: 'sender', approvalStatus: 'pending' } }),
    ]);
    return { reports, companyCount, userCount, evaluatorCount, pendingCompanies, setupProblems };
  },
});
