import ReportCoverTemplate from '@/components/reports/ReportCoverTemplate';
import { loadView } from '@/lib/api/server';
import { requireUser } from '@/lib/auth';
import { formatDate, formatScore } from '@shared/utils';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReportCoverPage(props: Props) {
  const params = await props.params;
  const currentUser = await requireUser();
  if (currentUser.role !== 'review_manager' && currentUser.role !== 'evaluator') {
    return <div className="p-8 text-center text-slate-500">Тайлангийн нүүр зөвхөн хүлээн авагч талд харагдана.</div>;
  }

  const cover = await loadView('report/:id/cover', { params });
  if (!cover) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }
  const { report, staff, manager } = cover;

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
