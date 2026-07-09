import Header from '@/components/Header';
import ReportCoverTemplate from '@/components/ReportCoverTemplate';
import Sidebar from '@/components/Sidebar';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/profileQr';
import { formatDate, formatScore } from '@/lib/utils';
import { uniqueAssignmentsByEvaluator } from '@/lib/reportAssignments';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
};

type ViewerRole = 'manager' | 'staff';

function sidebarItemsFor(role: ViewerRole) {
  if (role === 'staff') {
    return [
      { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
      { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
      { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
      { label: 'Тайлан хайх', href: '/evaluator/survey' },
    ];
  }

  return [
    { label: 'Хяналтын самбар', href: '/reviewer' },
    { label: 'Ирсэн тайлангууд', href: '/reviewer/reports' },
    { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
    { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
    { label: 'Тайлан хайх', href: '/reviewer/survey' },
    { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
    { label: 'Нэмэлт мэдээлэл', href: '/reviewer/reports?type=type-5' },
  ];
}

async function fetchReport(reportId: string) {
  return prisma.report.findUnique({
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
  const searchParams = await props.searchParams;
  const currentUser = await getCurrentUser();
  const viewerRole: ViewerRole | null =
    currentUser?.role === 'review_manager' || searchParams.role === 'reviewer'
      ? 'manager'
      : currentUser?.role === 'evaluator' || searchParams.role === 'staff'
        ? 'staff'
        : null;

  if (!viewerRole) {
    return <div className="p-8 text-center text-slate-500">Тайлангийн нүүр зөвхөн хүлээн авагч талд харагдана.</div>;
  }

  const [report, managerUser, coverSignatureLogs] = await Promise.all([
    fetchReport(params.id),
    prisma.user.findFirst({ where: { role: 'review_manager' } }),
    prisma.activityLog.findMany({
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
    <div className="print-portal cover-layout flex min-h-screen bg-background">
      <div className="cover-chrome">
        <Sidebar items={sidebarItemsFor(viewerRole)} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="cover-chrome">
          <Header
            userName={viewerRole === 'staff' ? 'Үнэлгээний ажилтан' : 'Хянах менежер'}
            companyName="Хянах байгууллага"
            role={viewerRole === 'staff' ? 'staff' : 'reviewer'}
          />
        </div>
        <div className="cover-main">
          <ReportCoverTemplate
            reportId={report.id}
            info={info}
            staff={staff}
            manager={manager}
            viewerRole={viewerRole}
            currentUserId={currentUser?.id || null}
            initialVerifiedSignatures={verifiedSignatures}
          />
        </div>
      </div>
    </div>
  );
}
