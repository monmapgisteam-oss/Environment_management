import ReportCoverTemplate from '@/components/reports/ReportCoverTemplate';
import dataStore from '@/lib/db';
import { requireUser } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';
import { formatDate, formatScore } from '@/lib/utils';
import { uniqueAssignmentsByEvaluator } from '@/lib/reports/assignments';

type Props = {
  params: Promise<{ id: string }>;
};

type ViewerRole = 'manager' | 'staff';

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

async function personWithQr(user: { id: string; name: string; position: string | null; role: string }) {
  return {
    id: user.id,
    name: user.name,
    roleLabel: user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан',
    position: user.position || (user.role === 'review_manager' ? 'Хянах менежер' : 'Үнэлгээний ажилтан'),
    qrUrl: createQrImageUrl(await getPublicProfileQrUrl(user.id), 180),
  };
}

export default async function ReportCoverPage(props: Props) {
  const params = await props.params;
  const currentUser = await requireUser();
  const viewerRole: ViewerRole | null =
    currentUser.role === 'review_manager' ? 'manager' : currentUser.role === 'evaluator' ? 'staff' : null;

  if (!viewerRole) {
    return <div className="p-8 text-center text-slate-500">Тайлангийн нүүр зөвхөн хүлээн авагч талд харагдана.</div>;
  }

  const [report, managerUser, coverSignatureLogs] = await Promise.all([
    fetchReport(params.id),
    dataStore.user.findFirst({ where: { role: 'review_manager' } }),
    dataStore.activityLog.findMany({
      where: { reportId: params.id, action: 'cover_signature_verified' },
      select: { userId: true, createdAt: true },
    }),
  ]);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments);
  const staffUsers = uniqueAssignments.map((assignment: any) => assignment.evaluator).filter(Boolean);
  const [staff, manager] = await Promise.all([
    Promise.all(staffUsers.map(personWithQr)),
    managerUser ? personWithQr(managerUser) : Promise.resolve(null),
  ]);
  const verifiedSignatures = coverSignatureLogs.map((log) => ({
    userId: log.userId,
    verifiedAt: log.createdAt.toISOString(),
  }));

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
      <ReportCoverTemplate
        reportId={report.id}
        info={info}
        staff={staff}
        manager={manager}
        viewerRole={viewerRole}
        currentUserId={currentUser.id}
        initialVerifiedSignatures={verifiedSignatures}
      />
    </div>
  );
}
