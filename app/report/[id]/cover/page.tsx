import ReportCoverTemplate from '@/components/reports/ReportCoverTemplate';
import dataStore from '@/lib/db';
import { canAccessReport, requireUser } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { formatDate, formatScore } from '@/lib/utils';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchReport(reportId: string) {
  return dataStore.report.findUnique({
    where: { id: reportId },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: {
        include: {
          evaluator: true,
          evaluation: true,
        },
        orderBy: { assignedAt: 'asc' },
      },
    },
  });
}

async function personWithQr(user: { id: string; name: string; position: string | null; role: string }, signedAt: Date | null) {
  return {
    signedAt: signedAt ? signedAt.toISOString() : null,
    id: user.id,
    name: user.name,
    roleLabel: user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан',
    position: user.position || (user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан'),
    qrUrl: await createQrImageUrl(await getPublicProfileQrUrl(user.id), 180),
  };
}

export default async function ReportCoverPage(props: Props) {
  const params = await props.params;
  const currentUser = await requireUser();
  if (currentUser.role !== 'review_manager' && currentUser.role !== 'evaluator') {
    return <div className="p-8 text-center text-slate-500">Тайлангийн нүүр зөвхөн хүлээн авагч талд харагдана.</div>;
  }

  const report = await fetchReport(params.id);
  if (!report || !(await canAccessReport(currentUser, report))) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  // Signatures come from the workflow itself: each evaluator's signed scores
  // and the manager who approved them.
  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments).filter((assignment) => assignment.evaluator);
  const approver = report.scoresApprovedById
    ? await dataStore.user.findUnique({ where: { id: report.scoresApprovedById } })
    : null;
  const [staff, manager] = await Promise.all([
    Promise.all(
      uniqueAssignments.map((assignment) =>
        personWithQr(
          assignment.evaluator,
          assignment.evaluation?.status === 'SIGNED' && assignment.evaluation.signatureStatus === 'VERIFIED'
            ? assignment.evaluation.signedAt
            : null,
        ),
      ),
    ),
    approver && report.scoresApprovedAt ? personWithQr(approver, report.scoresApprovedAt) : Promise.resolve(null),
  ]);

  const locationLabel = [
    report.location?.province,
    report.location?.district,
    report.location?.khoroo,
    report.location?.addressDetail,
  ]
    .filter((value) => value && value !== 'Тодорхойгүй')
    .join(', ');

  const info = {
    reportNumber: report.reportNumber,
    title: report.title,
    reportType: report.reportType.name,
    senderCompanyName: report.senderCompany?.name || '-',
    submittedAt: formatDate(report.submittedAt),
    implementerName: report.implementerName || report.senderCompany?.name || '-',
    implementerRegister: report.implementerRegister || report.senderCompany?.registerNumber || '-',
    approvedDate: report.approvedDate ? formatDate(report.approvedDate) : '-',
    locationLabel: locationLabel || '-',
    description: report.description || '',
    finalScore: formatScore(report.finalScore),
  };

  return (
    <div className="cover-main">
      <ReportCoverTemplate info={info} staff={staff} manager={manager} />
    </div>
  );
}
