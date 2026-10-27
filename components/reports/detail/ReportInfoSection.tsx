import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { senderStatus } from '@/lib/reports/scoreRelease';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import type { ReportDetail } from './types';

type Props = {
  report: ReportDetail;
  isConclusion: boolean;
  isSenderView: boolean;
};

// Report header (number, status) plus the submitted project fields and location.
export default function ReportInfoSection({ report, isConclusion, isSenderView }: Props) {
  const isPlanOrPerformanceReport =
    report.reportType?.name?.includes('Жилийн') || report.reportType?.name?.includes('Биелэлт');
  let displayStatus = report.status === 'approved' ? 'completed' : report.status === 'assigned' ? 'submitted' : report.status;
  // "return_requested" is an internal staff→manager step; the sender should still
  // see the report as under review until the manager actually returns it.
  if (isSenderView && report.status === 'return_requested') displayStatus = 'in_review';
  // Until the manager signs the scores off, the sender still sees "under review".
  if (isSenderView && senderStatus(report) === 'in_review') displayStatus = 'in_review';

  return (
    <div className="bg-white border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">
            {isConclusion ? 'Дүгнэлтийн дугаар' : 'Тайлангийн дугаар'}
          </p>
          <h1 className="text-xl font-bold text-slate-900">
            {isConclusion ? report.conclusionNumber || report.reportNumber : report.reportNumber}
          </h1>
        </div>
        <StatusBadge status={displayStatus} />
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
        <div>
          <p className="text-slate-500 text-xs">Төслийн нэр</p>
          <p className="font-medium text-slate-800 mt-0.5">{isConclusion ? report.projectName || report.title : report.title}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">{isConclusion ? 'Дүгнэлтийн төрөл' : 'Төрөл'}</p>
          <p className="font-medium text-slate-800 mt-0.5">
            {isConclusion ? report.description || GENERAL_EVALUATION_CONCLUSION_TITLE : report.reportType.name}
          </p>
        </div>
        {!isConclusion && report.reportCategory && (
          <div>
            <p className="text-slate-500 text-xs">Төслийн ангилал</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.reportCategory}</p>
          </div>
        )}
        {isConclusion && (
          <>
            <div>
              <p className="text-slate-500 text-xs">Дүгнэлт гаргасан он</p>
              <p className="font-medium text-slate-800 mt-0.5">{report.year}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Төслийн ангилал</p>
              <p className="font-medium text-slate-800 mt-0.5">{report.reportCategory || '-'}</p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Төсөл хэрэгжих байршил</p>
              <p className="font-medium text-slate-800 mt-0.5">
                {report.location ? [report.location.province, report.location.district].filter(Boolean).join(', ') : '-'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 text-xs">Төсөл хэрэгжүүлэгчийн нэр</p>
              <p className="font-medium text-slate-800 mt-0.5">{report.implementerName || report.senderCompany?.name}</p>
            </div>
          </>
        )}
        <div>
          <p className="text-slate-500 text-xs">Илгээсэн байгууллага</p>
          <p className="font-medium text-slate-800 mt-0.5">{report.senderCompany?.name}</p>
        </div>
        <div>
          <p className="text-slate-500 text-xs">Илгээсэн огноо</p>
          <p className="font-medium text-slate-800 mt-0.5">{formatDate(report.submittedAt)}</p>
        </div>
        {!isConclusion && report.implementerName && (
          <div>
            <p className="text-slate-500 text-xs">Төсөл хэрэгжүүлэгчийн нэр</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.implementerName}</p>
          </div>
        )}
        {!isConclusion && report.implementerRegister && (
          <div>
            <p className="text-slate-500 text-xs">Төсөл хэрэгжүүлэгчийн РД</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.implementerRegister}</p>
          </div>
        )}
        {!isConclusion && report.approvedDate && (
          <div>
            <p className="text-slate-500 text-xs">Тайлан батлагдсан огноо</p>
            <p className="font-medium text-slate-800 mt-0.5">{formatDate(report.approvedDate)}</p>
          </div>
        )}
        {!isConclusion && report.hasGreenery != null && (
          <div>
            <p className="text-slate-500 text-xs">Ногоон байгууламжтай эсэх</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.hasGreenery ? 'Тийм' : 'Үгүй'}</p>
          </div>
        )}
        {!isConclusion && report.hasGreenery && report.treeCount != null && (
          <div>
            <p className="text-slate-500 text-xs">Тарьсан мод</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.treeCount}</p>
          </div>
        )}
        {!isConclusion && report.spentAmount != null && (
          <div>
            <p className="text-slate-500 text-xs">Зарцуулсан дүн</p>
            <p className="font-medium text-slate-800 mt-0.5">{report.spentAmount.toLocaleString()}₮</p>
          </div>
        )}
      </div>

      {!isConclusion && report.description && (
        <div className="mt-5 pt-5 border-t border-slate-100 text-sm">
          <p className="text-slate-500 text-xs">
            {!isConclusion && isPlanOrPerformanceReport ? 'Ногоон байгууламжийн талаарх мэдээлэл' : 'Тайлбар'}
          </p>
          <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{report.description}</p>
        </div>
      )}
    </div>
  );
}
