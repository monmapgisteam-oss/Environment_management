import EvaluationTable from '@/components/evaluation/EvaluationTable';
import AttachmentList from '@/components/reports/AttachmentList';
import MaterialAttachmentList from '@/components/reports/MaterialAttachmentList';
import LocationMap from '@/components/map/LocationMapClient';
import { loadView } from '@/lib/api/server';
import { scoringAttachmentsFor } from '@shared/reports/scoringAttachments';
import { requireUser } from '@/lib/auth';
import Link from 'next/link';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReviewerEvaluatePage(props: Props) {
  // Checked here too, not only in the layout: a soft navigation can skip it.
  const user = await requireUser('review_manager');
  const params = await props.params;
  const view = await loadView('reviewer/evaluate/:id', { params });

  if (view.state === 'missing') {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }
  if (view.state === 'blocked') {
    const { report, scoringError } = view;
    return (
      <main className="flex-1 min-w-0 space-y-4 px-6 py-7 lg:px-8">
        <h1 className="text-xl font-semibold text-slate-900">{report.reportNumber} · Менежерийн үнэлгээ</h1>
        <p className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">{scoringError}</p>
        <Link href={`/report/${report.id}?role=reviewer`} className="inline-flex text-sm font-semibold text-teal-700 hover:underline">Тайлан руу буцах</Link>
      </main>
    );
  }
  const { report, scoringError, criteria: tableCriteria, attachments: signedAttachments, ownEvaluation, otherEvaluations } = view;
  const { criterionAttachments, reportAttachments } = scoringAttachmentsFor(signedAttachments, tableCriteria);
  const locationMap =
    report.location?.latitude != null && report.location?.longitude != null
      ? { lat: report.location.latitude, lng: report.location.longitude }
      : null;

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      {/* Report Info */}
      <div className="bg-white border border-slate-200 p-6">
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
        <div className="overflow-hidden border border-slate-200 bg-white">
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
      <MaterialAttachmentList attachments={signedAttachments} reportType={{ name: report.reportType.name, slug: report.reportType.slug }} reportCategory={report.reportCategory} />

      {/* Evaluation Table */}
      <EvaluationTable
        criteria={tableCriteria}
        reportId={report.id}
        savedScores={
          ownEvaluation?.scores?.reduce((acc: Record<string, string>, s) => {
            acc[s.criterionId] = String(s.score);
            return acc;
          }, {}) || null
        }
        savedNotes={Object.fromEntries((ownEvaluation?.scores || []).map((s) => [s.criterionId, s.note || '']))}
        savedComment={ownEvaluation?.comment || null}
        locked={!!scoringError || ownEvaluation?.status === 'SIGNED'}
        signatureStatus={ownEvaluation?.signatureStatus || null}
        signedAt={ownEvaluation?.signedAt ? ownEvaluation.signedAt.toISOString() : null}
        signatureId={ownEvaluation?.signatureId || null}
        selfName={user.name}
        title="Менежерийн дүгнэх хуудас"
        redirectTo={`/report/${report.id}?role=reviewer`}
        otherEvaluations={otherEvaluations}
        greenery={{ hasGreenery: report.hasGreenery, treeCount: report.treeCount, spentAmount: report.spentAmount }}
        criterionAttachments={criterionAttachments}
      />
    </main>
  );
}
