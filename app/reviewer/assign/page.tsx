import dataStore from '@/lib/db';
import AssignBoard from '@/components/evaluation/AssignBoard';
import { STAFF_EMAILS } from '@/lib/constants';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { fetchSurveyReports } from '@/lib/survey/reports';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

async function fetchStaff() {
  const staff = await dataStore.user.findMany({
    where: { role: 'evaluator', email: { in: STAFF_EMAILS } },
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
  const [rawReports, surveyReports] = await Promise.all([
    dataStore.report.findMany({
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
    }),
    fetchSurveyReports(),
  ]);
  const reports = await attachEffectiveSenderCompanies(rawReports);
  const existingReportNumbers = new Set(reports.map((report: any) => report.reportNumber));
  return [
    ...reports.map((report: any) => ({
      id: report.id,
      reportNumber: report.reportNumber,
      title: report.title,
      reportTypeName: report.reportType.name,
      senderName: report.senderCompany?.name || '-',
      status: report.status,
      assignees: uniqueAssignmentsByEvaluator(report.assignments).map((a: any) => ({ id: a.evaluator.id, name: a.evaluator.name })),
    })),
    ...surveyReports
      .filter((report) => !existingReportNumbers.has(report.reportNumber))
      .map((report) => ({
        id: report.id,
        reportNumber: report.reportNumber,
        title: report.title,
        reportTypeName: report.reportType.name,
        senderName: report.senderCompany?.name || '-',
        status: report.status,
        assignees: [],
      })),
  ].sort((a, b) => a.reportNumber.localeCompare(b.reportNumber));
}

export default async function AssignPage() {
  const [staff, reports] = await Promise.all([
    fetchStaff(),
    fetchDistributableReports(),
  ]);

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Гишүүдэд оноох</h2>
        <p className="text-sm text-slate-600">Ирсэн тайлангуудыг үнэлгээний гишүүдэд хуваарилна.</p>
      </div>

      <AssignBoard reports={reports} staff={staff} />
    </main>
  );
}
