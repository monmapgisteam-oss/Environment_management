import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import AssignBoard from '@/components/AssignBoard';
import { STAFF_EMAILS } from '@/lib/constants';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { fetchSurveyReports } from '@/lib/surveyReports';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reportAssignments';

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchStaff() {
  const staff = await prisma.user.findMany({
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
    prisma.report.findMany({
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
  const [reportTypes, staff, reports] = await Promise.all([
    fetchReportTypes(),
    fetchStaff(),
    fetchDistributableReports(),
  ]);

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Хяналтын самбар', href: '/reviewer' },
            { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
            { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
            { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
            { label: 'Тайлан хайх', href: '/reviewer/survey' },
            { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
            { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-6 p-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Гишүүдэд оноох</h2>
            <p className="text-sm text-slate-600">Ирсэн тайлангуудыг үнэлгээний гишүүдэд хуваарилна.</p>
          </div>

          <AssignBoard reports={reports} staff={staff} />
        </main>
      </div>
    </div>
  );
}
