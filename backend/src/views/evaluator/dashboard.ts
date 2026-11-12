import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import type { EvaluatorAssignedRow } from '@shared/views/evaluator';
import { defineView } from '../define';
import { reportRow } from './rows';

// Only the reports the manager distributed to THIS staff member, optionally
// narrowed to a single report type (sidebar sub-item).
async function fetchAssignedReports(evaluatorUserId: string, typeSlug?: string): Promise<EvaluatorAssignedRow[]> {
  const assignments = await dataStore.reportAssignment.findMany({
    where: {
      evaluatorUserId,
      report: {
        title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
        ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
      },
    },
    include: {
      report: {
        include: {
          reportType: true,
          senderCompany: true,
          location: true,
        },
      },
    },
    orderBy: { assignedAt: 'desc' },
  });

  const reports = await attachEffectiveSenderCompanies(assignments.map((assignment) => assignment.report));
  const reportById = new Map(reports.map((report) => [report.id, report]));

  const seenReportIds = new Set<string>();
  return assignments.filter((assignment) => {
    if (seenReportIds.has(assignment.report.id)) return false;
    seenReportIds.add(assignment.report.id);
    return true;
  }).map((assignment) => {
    const report = reportById.get(assignment.report.id) || assignment.report;
    // Surface the report's own state for return flows so the staff member sees
    // "Буцаах хүсэлт илгээгдсэн" after they ask the manager to return it (and
    // "Засвар шаардсан" if the manager actually returned it to the sender).
    // Otherwise derive the status from whether they have submitted their score.
    const reportStatus = report.status;
    const status =
      reportStatus === 'return_requested' || reportStatus === 'needs_revision'
        ? reportStatus
        : assignment.status === 'submitted'
          ? 'completed'
          : 'in_review';
    return {
      assignmentStatus: assignment.status,
      dueDate: assignment.deadline ? assignment.deadline.toISOString() : null,
      ...reportRow(report, status, report.finalScore),
    };
  });
}

export default defineView({
  name: 'evaluator',
  roles: ['evaluator'],
  async load({ user, query }) {
    const type = query.get('type') || undefined;
    const [reportTypes, reports] = await Promise.all([
      dataStore.reportType.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      }),
      fetchAssignedReports(user.id, type),
    ]);
    const activeTypeName = type ? reportTypes.find((rt) => rt.slug === type)?.name ?? null : null;
    return { activeTypeName, reports };
  },
});
