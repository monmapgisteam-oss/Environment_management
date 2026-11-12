import { loadView } from "@/lib/api/server";
import { requireUser } from "@/lib/auth";
import EvaluationTable from "@/components/evaluation/EvaluationTable";
import AttachmentList from "@/components/reports/AttachmentList";
import MaterialAttachmentList from "@/components/reports/MaterialAttachmentList";
import StaffReturnButton from "@/components/reports/StaffReturnButton";
import LocationMap from "@/components/map/LocationMapClient";
import { formatDate } from "@shared/utils";
import { scoringAttachmentsFor } from "@shared/reports/scoringAttachments";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function StaffEvaluatePage(props: Props) {
  const params = await props.params;
  const user = await requireUser('evaluator');

  // A staff member may only score a report the manager assigned to them.
  const view = await loadView('evaluator/evaluate/:id', { params });

  if (!view.assigned) {
    return (
      <div className="p-8 text-center text-slate-500">
        Танд энэ тайлан оноогдоогүй байна.
      </div>
    );
  }

  const { report, deadline, evaluation, criteria: tableCriteria, attachments: signedAttachments, sections, scorable } = view;

  // Each staff member only ever sees their own scoring — other evaluators'
  // scores are deliberately not loaded here.
  const savedScores =
    evaluation?.scores?.reduce(
      (acc: Record<string, string>, s) => {
        acc[s.criterionId] = String(s.score);
        return acc;
      },
      {},
    ) || null;
  const { criterionAttachments, reportAttachments } = scoringAttachmentsFor(signedAttachments, tableCriteria);
  const signed = evaluation?.status === 'SIGNED';
  // A report that went back to the sender (or awaits the manager's decision on
  // a return) can't be scored until it comes back; signed scores never change.
  const pausedNotice =
    report.status === 'needs_revision'
      ? 'Тайланг илгээгчид засуулахаар буцаасан. Засварласны дараа дахин үнэлнэ.'
      : report.status === 'return_requested'
      ? 'Буцаах хүсэлтийг менежер шийдвэрлэж байна. Шийдвэр гарсны дараа үргэлжлүүлнэ.'
      : null;
  const locationMap =
    report.location?.latitude != null && report.location?.longitude != null
      ? { lat: report.location.latitude, lng: report.location.longitude }
      : null;

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      {/* Report info */}
      <div className="bg-white border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500">Тайлангийн дугаар</p>
            <h1 className="text-xl font-bold text-slate-900">
              {report.reportNumber}
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-500">Төрөл</p>
            <p className="text-sm font-semibold text-slate-700">
              {report.reportType.name}
            </p>
          </div>
        </div>

        {/* Deadline the manager set when distributing this report */}
        {deadline && (
          <div className="mb-4 flex items-center gap-2 border border-amber-200 bg-amber-50 px-4 py-3">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span className="text-sm text-amber-800">
              <span className="font-medium">Хүлээлгэх хугацаа:</span>{" "}
              {formatDate(deadline)}
            </span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <span className="text-slate-500">Төслийн нэр: </span>
            <span className="font-medium text-slate-800">
              {report.title}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Байгууллага: </span>
            <span className="font-medium text-slate-800">
              {report.senderCompany?.name || "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Хэрэгжүүлэгч: </span>
            <span className="font-medium text-slate-800">
              {report.implementerName || "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Хэрэгжүүлэгчийн РД: </span>
            <span className="font-medium text-slate-800">
              {report.implementerRegister || "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Батлагдсан огноо: </span>
            <span className="font-medium text-slate-800">
              {formatDate(report.approvedDate)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Илгээсэн огноо: </span>
            <span className="font-medium text-slate-800">
              {formatDate(report.submittedAt)}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Тайлангийн он: </span>
            <span className="font-medium text-slate-800">
              {report.year || "-"}
            </span>
          </div>
          <div>
            <span className="text-slate-500">Байршил: </span>
            <span className="font-medium text-slate-800">
              {report.location?.latitude != null &&
              report.location?.longitude != null
                ? `${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}`
                : "-"}
            </span>
          </div>
          {report.location?.addressDetail && (
            <div>
              <span className="text-slate-500">Дэлгэрэнгүй хаяг: </span>
              <span className="font-medium text-slate-800">
                {report.location.addressDetail}
              </span>
            </div>
          )}
          {report.description && (
            <div className="col-span-2">
              <span className="text-slate-500">Тайлбар: </span>
              <span className="font-medium text-slate-800">
                {report.description}
              </span>
            </div>
          )}
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
      {reportAttachments.length > 0 && (
        <AttachmentList
          attachments={reportAttachments}
        />
      )}
      <MaterialAttachmentList attachments={signedAttachments} reportType={{ name: report.reportType.name, slug: report.reportType.slug }} reportCategory={report.reportCategory} />

      {!signed && pausedNotice && (
        <div className="border border-amber-200 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">{pausedNotice}</div>
      )}

      {/* Scoring — staff see only their own column, never other evaluators'. */}
      <EvaluationTable
        criteria={tableCriteria}
        reportId={report.id}
        savedScores={savedScores}
        savedNotes={Object.fromEntries((evaluation?.scores || []).map((s) => [s.criterionId, s.note || '']))}
        savedComment={evaluation?.comment || null}
        locked={signed || !scorable}
        signatureStatus={evaluation?.signatureStatus || null}
        signedAt={evaluation?.signedAt ? evaluation.signedAt.toISOString() : null}
        signatureId={evaluation?.signatureId || null}
        greenery={{ hasGreenery: report.hasGreenery, treeCount: report.treeCount, spentAmount: report.spentAmount }}
        criterionAttachments={criterionAttachments}
        redirectTo="/evaluator"
        selfName={user.name}
        leftAction={
          !signed && scorable && (
          <div className="flex flex-col items-start gap-1">
            <StaffReturnButton reportId={report.id} sections={sections} />
            <p className="text-sm text-slate-500">
              Дутуу бол илгээгчид засуулахаар буцаана.
            </p>
          </div>
          )
        }
      />
    </main>
  );
}
