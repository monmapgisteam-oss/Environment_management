import dataStore from '@/lib/db';
import EvaluationTable from '@/components/evaluation/EvaluationTable';
import AttachmentList from '@/components/reports/AttachmentList';
import LocationMap from '@/components/map/LocationMapClient';
import { parseAttachments } from '@/lib/reports/attachments';
import { signAttachments } from '@/lib/db/storage';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { splitScoringAttachments } from '@/lib/reports/scoringAttachments';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchReport(id: string) {
  const report = await dataStore.report.findUnique({
    where: { id, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      evaluations: {
        include: {
          scores: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  });
  return report ? (await attachEffectiveSenderCompanies([report]))[0] : null;
}

async function fetchCriteria() {
  return dataStore.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export default async function ReviewerEvaluatePage(props: Props) {
  const params = await props.params;
  const [report, criteria] = await Promise.all([
    fetchReport(params.id),
    fetchCriteria(),
  ]);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const signedAttachments = await signAttachments(parseAttachments(report.fileUrl));
  const tableCriteria = criteria.map((c: any) => ({
    id: c.id,
    name: c.name,
    maxScore: c.maxScore,
    sortOrder: c.sortOrder,
  }));
  const { criterionAttachments, reportAttachments } = splitScoringAttachments(signedAttachments, tableCriteria);
  const locationMap =
    report.location?.latitude != null && report.location?.longitude != null
      ? { lat: report.location.latitude, lng: report.location.longitude }
      : null;

  return (
    <main className="flex-1 min-w-0 p-6 space-y-6">
      {/* Report Info */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500">Тайлангийн дугаар</p>
            <h1 className="text-xl font-bold text-slate-900">{report.reportNumber}</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Төрөл</p>
            <p className="text-sm font-semibold text-slate-700">{report.reportType.name}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-slate-500">Төслийн нэр: </span>
            <span className="font-medium text-slate-800">{report.title}</span>
          </div>
          <div>
            <span className="text-slate-500">Байгууллага: </span>
            <span className="font-medium text-slate-800">{report.senderCompany.name}</span>
          </div>
        </div>
      </div>

      {locationMap && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">Газрын зураг дээрх байршил</h2>
            <p className="mt-1 text-sm text-slate-500">
              {locationMap.lat.toFixed(6)}, {locationMap.lng.toFixed(6)}
            </p>
          </div>
          <div className="h-80">
            <LocationMap lat={locationMap.lat} lng={locationMap.lng} />
          </div>
        </div>
      )}

      {/* Attached documents the sender submitted */}
      {reportAttachments.length > 0 && <AttachmentList attachments={reportAttachments} />}

      {/* Evaluation Table */}
      <EvaluationTable
        criteria={tableCriteria}
        reportId={report.id}
        savedScores={
          report.evaluations?.[0]?.scores?.reduce((acc: Record<string, string>, s: any) => {
            acc[s.criterionId] = String(s.score);
            return acc;
          }, {}) || null
        }
        savedComment={report.evaluations?.[0]?.comment || null}
        locked={report.evaluations?.[0]?.status === 'SIGNED'}
        signatureStatus={report.evaluations?.[0]?.signatureStatus || null}
        signedAt={report.evaluations?.[0]?.signedAt ? report.evaluations[0].signedAt.toISOString() : null}
        signatureId={report.evaluations?.[0]?.signatureId || null}
        greenery={{ hasGreenery: report.hasGreenery, treeCount: report.treeCount, spentAmount: report.spentAmount }}
        criterionAttachments={criterionAttachments}
      />
    </main>
  );
}
