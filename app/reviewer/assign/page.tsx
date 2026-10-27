import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import { ACTIVE_USER_WHERE } from '@/lib/auth/accounts';
import AssignBoard from '@/components/evaluation/AssignBoard';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

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
      status: { in: ['submitted', 'assigned', 'in_review', 'needs_revision'] },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
    },
    include: {
      reportType: true,
      senderCompany: true,
      assignments: { include: { evaluator: { select: { id: true, name: true } } } },
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
      assignees: uniqueAssignmentsByEvaluator(report.assignments).map((a) => ({ id: a.evaluator.id, name: a.evaluator.name })),
    }))
    .sort((a, b) => a.reportNumber.localeCompare(b.reportNumber));
}

export default async function AssignPage() {
  const [staff, reports] = await Promise.all([
    fetchStaff(),
    fetchDistributableReports(),
  ]);

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Гишүүдэд оноох" subtitle="Ирсэн тайлангуудыг үнэлгээний гишүүдэд хуваарилна." />

      <AssignBoard reports={reports} staff={staff} />
    </main>
  );
}
