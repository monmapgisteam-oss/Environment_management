import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { ACTIVE_USER_WHERE } from '@shared/auth/accounts';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

async function fetchReviewerReports() {
  const reports = await dataStore.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: { status: { not: 'draft' }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: { select: { evaluator: { select: { role: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

// Every evaluator with how many of their assignments still wait for a score.
async function fetchStaffWorkload() {
  const staff = await dataStore.user.findMany({
    where: { role: 'evaluator', ...ACTIVE_USER_WHERE },
    select: { id: true, name: true, evaluatorAssignments: { select: { reportId: true, status: true } } },
    orderBy: { name: 'asc' },
  });
  return staff.map((member) => {
    const open = member.evaluatorAssignments.filter((a) => a.status !== 'submitted');
    const done = member.evaluatorAssignments.filter((a) => a.status === 'submitted');
    return {
      id: member.id,
      name: member.name,
      open: new Set(open.map((a) => a.reportId)).size,
      done: new Set(done.map((a) => a.reportId)).size,
    };
  });
}

export default defineView({
  name: 'reviewer',
  roles: ['review_manager'],
  async load() {
    const [reports, staff, pendingCompanies] = await Promise.all([
      fetchReviewerReports(),
      fetchStaffWorkload(),
      dataStore.company.count({ where: { type: 'sender', approvalStatus: 'pending' } }),
    ]);
    return { reports, staff, pendingCompanies };
  },
});
