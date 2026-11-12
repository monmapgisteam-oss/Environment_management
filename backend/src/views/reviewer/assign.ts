import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { ACTIVE_USER_WHERE } from '@shared/auth/accounts';
import { uniqueAssignmentsByEvaluator } from '@shared/reports/assignments';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

async function fetchStaff() {
  const staff = await dataStore.user.findMany({
    where: { role: 'evaluator', ...ACTIVE_USER_WHERE },
    select: {
      id: true,
      name: true,
      position: true,
      email: true,
      phone: true,
      _count: { select: { evaluatorAssignments: true } },
    },
    orderBy: { name: 'asc' },
  });
  return staff.map((s) => ({
    id: s.id,
    name: s.name,
    position: s.position,
    email: s.email,
    phone: s.phone,
    assignedCount: s._count.evaluatorAssignments,
  }));
}

async function fetchDistributableReports() {
  const rawReports = await dataStore.report.findMany({
    where: {
      status: { in: ['submitted', 'assigned', 'in_review'] },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
    },
    include: {
      reportType: true,
      senderCompany: true,
      assignments: { include: { evaluator: { select: { id: true, name: true, role: true } } } },
    },
    orderBy: { submittedAt: 'desc' },
  });
  const reports = await attachEffectiveSenderCompanies(rawReports);
  return reports
    .map((report) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      title: report.title,
      reportTypeName: report.reportType.name,
      senderName: report.senderCompany?.name || '-',
      status: report.status,
      assignees: uniqueAssignmentsByEvaluator(report.assignments).filter((a) => a.evaluator.role === 'evaluator').map((a) => ({ id: a.evaluator.id, name: a.evaluator.name })),
    }))
    .sort((a, b) => a.reportNumber.localeCompare(b.reportNumber));
}

// Active evaluators and the reports that can still be assigned to them.
export default defineView({
  name: 'reviewer/assign',
  roles: ['review_manager'],
  async load() {
    const [staff, reports] = await Promise.all([fetchStaff(), fetchDistributableReports()]);
    return { staff, reports };
  },
});
