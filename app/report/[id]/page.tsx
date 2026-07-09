import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import AttachmentList from '@/components/AttachmentList';
import ManagerReturnPanel from '@/components/ManagerReturnPanel';
import LocationMap from '@/components/LocationMapClient';
import ScanPrintPanel from '@/components/ScanPrintPanel';
import SignatureBadge from '@/components/SignatureBadge';
import { parseAttachments, downloadUrl } from '@/lib/attachments';
import { signAttachments, createSignedUrl } from '@/lib/supabase';
import { formatDate, formatScore } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { fetchSurveyReportByObjectId } from '@/lib/surveyReports';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { senderSidebarItems } from '@/lib/senderNav';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';
import { uniqueAssignmentsByEvaluator } from '@/lib/reportAssignments';
import { splitScoringAttachments } from '@/lib/scoringAttachments';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
};

function parseSurveyReportId(id: string) {
  const match = /^survey-(\d+)$/.exec(id);
  return match ? Number(match[1]) : null;
}

function surveySidebarItems(role?: string) {
  if (role === 'sender') {
    return senderSidebarItems('reports');
  }
  if (role === 'staff') {
    return [
      { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
      { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
      { label: 'Тайлан хайх', href: '/evaluator/survey' },
    ];
  }
  return [
    { label: 'Хяналтын самбар', href: '/reviewer' },
    { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', active: true },
    { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
    { label: 'Тайлан хайх', href: '/reviewer/survey' },
  ];
}

async function SurveyReportDetail({ objectId, role }: { objectId: number; role?: string }) {
  const survey = await fetchSurveyReportByObjectId(objectId);
  const viewerRole: 'sender' | 'manager' | 'staff' = role === 'sender' ? 'sender' : role === 'staff' ? 'staff' : 'manager';
  const headerRole = role === 'staff' ? 'staff' : role === 'sender' ? undefined : 'reviewer';

  if (!survey) {
    return <div className="p-8 text-center text-slate-500">Survey123 тайлан олдсонгүй.</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={surveySidebarItems(role)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header
          userName={viewerRole === 'staff' ? 'Үнэлгээний ажилтан' : viewerRole === 'sender' ? 'Илгээх хэрэглэгч' : 'Хянах менежер'}
          companyName={viewerRole === 'sender' ? 'Илгээх байгууллага' : 'Хянах байгууллага'}
          role={headerRole as any}
          companyType={viewerRole === 'sender' ? 'sender' : 'reviewer'}
        />
        <main className="flex-1 min-w-0 p-6 space-y-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-amber-600">Survey системээс тайлан ирлээ</p>
                <h1 className="mt-1 text-2xl font-bold text-slate-900">{survey.title}</h1>
                <p className="mt-1 text-sm text-slate-500">{survey.reportNumber}</p>
              </div>
              <StatusBadge status="submitted" />
            </div>
            <div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs text-slate-500">Тайлангийн төрөл</p>
                <p className="mt-0.5 font-medium text-slate-800">{survey.reportType.name}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Байгууллага</p>
                <p className="mt-0.5 font-medium text-slate-800">{survey.senderCompany?.name || survey.organization || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">РД</p>
                <p className="mt-0.5 font-medium text-slate-800">{survey.register || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Илгээсэн огноо</p>
                <p className="mt-0.5 font-medium text-slate-800">{formatDate(survey.submittedAt)}</p>
              </div>
            </div>
          </div>

          {survey.description && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-base font-semibold text-slate-900">Тайлбар</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm font-medium text-slate-800">{survey.description}</p>
            </div>
          )}

          {survey.photos.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">Хавсаргасан зураг</h2>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                  {survey.photos.length}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {survey.photos.map((photo, index) => (
                  <a
                    key={`${photo.src}-${index}`}
                    href={photo.src}
                    target="_blank"
                    rel="noreferrer"
                    className="group overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt || `Survey123 зураг ${index + 1}`}
                      className="h-32 w-full object-cover transition group-hover:scale-105"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {survey.lat != null && survey.lng != null && (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 px-6 py-4">
                <h2 className="text-base font-semibold text-slate-900">Газрын зураг дээрх байршил</h2>
              </div>
              <div className="h-80">
                <LocationMap lat={survey.lat} lng={survey.lng} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

async function fetchReportDetail(reportId: string) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
      assignments: {
        include: {
          evaluator: true,
          evaluation: {
            include: {
              scores: {
                include: { criterion: true },
              },
            },
          },
        },
      },
    },
  });
  return report ? (await attachEffectiveSenderCompanies([report]))[0] : null;
}

async function fetchCriteria() {
  return prisma.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export default async function ReportDetailPage(props: Props) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const surveyObjectId = parseSurveyReportId(params.id);
  if (surveyObjectId !== null) {
    return <SurveyReportDetail objectId={surveyObjectId} role={searchParams.role} />;
  }
  const currentUser = await getCurrentUser();
  const isStaff = currentUser?.role === 'evaluator' || (!currentUser && searchParams.role === 'staff');
  const isReviewer = currentUser?.role === 'review_manager' || (!currentUser && searchParams.role === 'reviewer');

  const [report, criteria, reportTypes] = await Promise.all([
    fetchReportDetail(params.id),
    fetchCriteria(),
    isReviewer ? fetchReportTypes() : Promise.resolve([]),
  ]);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  const uniqueAssignments = uniqueAssignmentsByEvaluator(report.assignments);

  // A staff member viewing the report may only see their OWN evaluation, never
  // their colleagues'. Managers and the sender see every evaluator's scores.
  const evaluations = uniqueAssignments
    .filter((a: any) => a.evaluation)
    .filter((a: any) => !isStaff || a.evaluator?.id === currentUser?.id)
    .map((a: any) => ({
      evaluatorName: a.evaluator.name,
      totalScore: a.evaluation.totalScore,
      comment: a.evaluation.comment,
      scores: a.evaluation.scores,
      // Safe verification metadata only — never the raw numeric signature/PIN.
      signatureStatus: a.evaluation.signatureStatus as string,
      signedAt: a.evaluation.signedAt ? a.evaluation.signedAt.toISOString() : null,
      signatureId: a.evaluation.signatureId as string | null,
      documentHash: a.evaluation.documentHash as string | null,
    }));

  const signedVerifiedScores = evaluations
    .filter((ev) => ev.signatureStatus === 'VERIFIED')
    .map((ev) => ev.totalScore);
  const displayFinalScore = signedVerifiedScores.length
    ? Math.round((signedVerifiedScores.reduce((sum, score) => sum + score, 0) / signedVerifiedScores.length) * 10) / 10
    : report.finalScore;

  // Staff this report was distributed to, with whether each has scored it yet.
  const assignedStaff = uniqueAssignments.map((a: any) => ({
    name: a.evaluator.name,
    position: a.evaluator.position,
    submitted: !!a.evaluation,
  }));

  const isSenderView = !isReviewer && !isStaff;
  const viewerRole: 'sender' | 'manager' | 'staff' = isReviewer ? 'manager' : isStaff ? 'staff' : 'sender';
  const isConclusion = report.title === GENERAL_EVALUATION_CONCLUSION_TITLE;
  const isPlanOrPerformanceReport =
    report.reportType?.name?.includes('Жилийн') || report.reportType?.name?.includes('Биелэлт');
  let displayStatus = report.status === 'approved' ? 'completed' : report.status === 'assigned' ? 'submitted' : report.status;
  const isSurveySource = report.reportNumber?.startsWith('S123-');
  // "return_requested" is an internal staff→manager step; the sender should still
  // see the report as under review until the manager actually returns it.
  if (isSenderView && report.status === 'return_requested') displayStatus = 'in_review';

  const attachments = await signAttachments(parseAttachments(report.fileUrl));
  const { criterionAttachments, reportAttachments } = splitScoringAttachments(attachments, criteria);
  const signedScanDownloadUrl = report.signedScanUrl ? await createSignedUrl(report.signedScanUrl) : null;

  // Manager only sees the print/scan panel once every assigned staff member
  // has actually submitted a score — nothing to sign before that.
  const allEvaluatorsDone = assignedStaff.length > 0 && assignedStaff.every((m: any) => m.submitted);

  // Scores stay hidden from the sender until the manager explicitly sends the
  // signed scan — a single staff member finishing (or even all of them) must
  // not leak scores early. Managers and staff always see what they're allowed to.
  const scoresVisible = !isSenderView || !!report.signedScanUrl;

  const locationLabel = [report.location?.province, report.location?.district, report.location?.khoroo, report.location?.addressDetail]
    .filter((v) => v && v !== 'Тодорхойгүй')
    .join(', ');

  const sidebarItems = isReviewer
    ? [
        { label: 'Хяналтын самбар', href: '/reviewer' },
        {
          label: 'Ирсэн тайлангууд',
          href: '/reviewer/reports',
          children: reportTypes
            .filter((rt: any) => rt.slug !== 'type-5')
            .map((rt: any) => ({
              label: rt.name,
              href: `/reviewer/reports?type=${rt.slug}`,
            })),
        },
        { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
        { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
        { label: 'Тайлан хайх', href: '/reviewer/survey' },
        { label: 'Буцаасан тайлан', href: '/reviewer/returned' },
        { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
      ]
    : isStaff
    ? [
        { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
        { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
        { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
        { label: 'Тайлан хайх', href: '/evaluator/survey' },
      ]
    : senderSidebarItems('reports');

  const backHref = isConclusion
    ? isReviewer
      ? '/reviewer/conclusions'
      : isStaff
        ? '/evaluator/conclusions'
        : '/sender/reports'
    : isReviewer
      ? '/reviewer'
      : isStaff
        ? '/evaluator'
        : '/sender';
  const coverHref = `/report/${report.id}/cover?role=${isStaff ? 'staff' : 'reviewer'}`;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={sidebarItems} />

        <div className="flex min-w-0 flex-1 flex-col">
        {isReviewer || isStaff ? (
          <Header userName={isStaff ? 'Үнэлгээний ажилтан' : 'Хянах менежер'} companyName="Хянах байгууллага" role={isStaff ? 'staff' : 'reviewer'} />
        ) : (
          <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
        )}
        <main className="flex-1 min-w-0 p-6 space-y-5">
          {(isReviewer || isStaff) && !isConclusion && (
            <div className="flex justify-end">
              <a
                href={coverHref}
                className="inline-flex h-10 items-center justify-center rounded-xl bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
              >
                Тайлангийн нүүр
              </a>
            </div>
          )}

          {/* Sender downloads the manager's scanned, physically-signed copy — top of screen. */}
          {isSenderView && signedScanDownloadUrl && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Гарын үсэгтэй хуулбар</h2>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span className="text-sm font-medium text-slate-800 flex-1 min-w-0 truncate">
                  {report.signedScanName || 'Гарын үсэгтэй хуулбар'}
                </span>
                <a
                  href={signedScanDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-color-primary hover:underline"
                >
                  Нээх
                </a>
                <a
                  href={downloadUrl({ url: signedScanDownloadUrl, name: report.signedScanName || 'signed-scan' })}
                  className="inline-flex items-center gap-1 rounded-lg bg-color-primary px-3 py-1.5 text-xs font-medium text-white hover:opacity-90 transition"
                >
                  Татах
                </a>
              </div>
            </div>
          )}

          {/* Manager sees which staff this report was distributed to (top). */}
          {isReviewer && !isConclusion && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
                <h2 className="text-base font-semibold text-slate-900">
                  Оноогдсон гишүүд <span className="font-normal text-slate-400">({assignedStaff.length})</span>
                </h2>
              </div>
              {assignedStaff.length === 0 ? (
                <p className="text-sm text-slate-500">Энэ тайлан одоогоор гишүүдэд оноогдоогүй байна.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {assignedStaff.map((member: any, index: number) => (
                    <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-primary text-sm font-bold text-white">
                        {member.name.charAt(0)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-800 truncate">{member.name}-т оноогдсон</p>
                        <p className="text-xs text-slate-500 truncate">{member.position || 'Үнэлэгч'}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${member.submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                        {member.submitted ? 'Үнэлсэн' : 'Хүлээгдэж буй'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Report Info */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                {isSurveySource && (
                  <span className="mb-2 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                    Survey системээс тайлан ирлээ
                  </span>
                )}
                <p className="text-xs text-slate-500 mb-0.5">
                  {isConclusion ? 'Дүгнэлтийн дугаар' : 'Тайлангийн дугаар'}
                </p>
                <h1 className="text-xl font-bold text-slate-900">{report.reportNumber}</h1>
              </div>
              <StatusBadge status={displayStatus} />
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">{isConclusion ? 'Дүгнэлтийн нэр' : 'Төслийн нэр'}</p>
                <p className="font-medium text-slate-800 mt-0.5">{report.title}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">{isConclusion ? 'Дүгнэлтийн төрөл' : 'Тайлангийн төрөл'}</p>
                <p className="font-medium text-slate-800 mt-0.5">
                  {isConclusion ? GENERAL_EVALUATION_CONCLUSION_TITLE : report.reportType.name}
                </p>
              </div>
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

            {report.description && (
              <div className="mt-5 pt-5 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs">
                  {!isConclusion && isPlanOrPerformanceReport ? 'Ногоон байгууламжийн талаарх мэдээлэл' : 'Тайлбар'}
                </p>
                <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{report.description}</p>
              </div>
            )}

            {!isConclusion && report.location && (report.location.addressDetail || (report.location.latitude != null && report.location.longitude != null)) && (
              <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
                {report.location.addressDetail && (
                  <div className="col-span-3">
                    <p className="text-slate-500 text-xs">Дэлгэрэнгүй хаяг</p>
                    <p className="font-medium text-slate-800 mt-0.5">{report.location.addressDetail}</p>
                  </div>
                )}
                {report.location.latitude != null && report.location.longitude != null && (
                  <div className="col-span-3">
                    <p className="text-slate-500 text-xs mb-2">
                      Байршил ({report.location.latitude.toFixed(6)}, {report.location.longitude.toFixed(6)})
                    </p>
                    <div className="rounded-xl overflow-hidden border border-slate-200" style={{ height: 320 }}>
                      <LocationMap lat={report.location.latitude} lng={report.location.longitude} />
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sender sees why the manager returned the report for revision. */}
          {isSenderView && !isConclusion && report.status === 'needs_revision' && report.returnReason && (
            <div className="bg-white rounded-2xl border border-orange-200 p-6">
              <p className="text-sm font-semibold text-orange-700">Тайлан засвар шаардсан байна</p>
              <p className="mt-1 text-sm text-slate-700">Шалтгаан: {report.returnReason}</p>
            </div>
          )}

          {/* Manager controls: confirm/dismiss a staff return request, or return
              the report to the sender directly. */}
          {isReviewer && !isConclusion && (
            <ManagerReturnPanel
              reportId={report.id}
              status={report.status}
              returnReason={report.returnReason}
              returnRequestedBy={report.returnRequestedBy}
            />
          )}

          {/* Attachments */}
          {reportAttachments.length > 0 && (
            <AttachmentList
              attachments={reportAttachments}
              title="Хавсаргасан файл"
              emptyText="Хавсаргасан файл байхгүй байна."
            />
          )}

          {/* Evaluation Scores Table */}
          {!isConclusion && evaluations.length > 0 && scoresVisible && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <h2 className="text-base font-semibold text-slate-900">Үнэлгээний дүн</h2>
                {isReviewer && allEvaluatorsDone && (
                  <ScanPrintPanel
                    reportId={report.id}
                    signedScanName={report.signedScanName}
                    signedScanUploadedAt={report.signedScanUploadedAt ? report.signedScanUploadedAt.toISOString() : null}
                    reportNumber={report.reportNumber}
                    title={report.title}
                    senderCompanyName={report.senderCompany?.name || ''}
                    submittedAtLabel={formatDate(report.submittedAt)}
                    implementerName={report.implementerName || ''}
                    locationLabel={locationLabel}
                    criteria={criteria}
                    evaluations={evaluations}
                  />
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">Авбал зохих оноо</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-56">Илгээсэн файл</th>
                      {evaluations.map((ev, i) => (
                        <th key={i} className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">
                          <div className="flex flex-col items-center gap-1">
                            <span>{ev.evaluatorName}</span>
                            <SignatureBadge
                              status={ev.signatureStatus}
                              signedAt={ev.signedAt}
                              signatureId={ev.signatureId}
                              signerName={ev.evaluatorName}
                              documentHash={ev.documentHash}
                              viewerRole={viewerRole}
                            />
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {criteria.map((criterion: any, index: number) => (
                      <tr key={criterion.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                        <td className="py-3 px-4 text-slate-800">{criterion.name}</td>
                        <td className="py-3 px-4 text-center font-semibold text-slate-700">{criterion.maxScore}</td>
                        <td className="py-3 px-4">
                          {(criterionAttachments[criterion.id] || []).length > 0 ? (
                            <div className="space-y-1.5">
                              {(criterionAttachments[criterion.id] || []).map((file, fileIndex) => (
                                <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-2">
                                  <span className="max-w-[130px] truncate text-xs text-slate-600">{file.name}</span>
                                  <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-color-primary hover:underline">
                                    Нээх
                                  </a>
                                  <a href={downloadUrl(file)} className="text-xs font-semibold text-color-primary hover:underline">
                                    Татах
                                  </a>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </td>
                        {evaluations.map((ev, i) => {
                          const score = ev.scores.find((s: any) => s.criterionId === criterion.id);
                          return (
                            <td key={i} className="py-3 px-4 text-center font-medium text-color-primary">
                              {score ? score.score : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                    <tr className="border-t-2 border-slate-300 bg-slate-50">
                      <td className="py-3 px-4"></td>
                      <td className="py-3 px-4 font-bold text-slate-900">Нийт оноо</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">
                        {criteria.reduce((sum: number, c: any) => sum + c.maxScore, 0)}
                      </td>
                      <td className="py-3 px-4"></td>
                      {evaluations.map((ev, i) => (
                        <td key={i} className="py-3 px-4 text-center font-bold text-color-primary text-lg">
                          {ev.totalScore}
                          {ev.signatureStatus === 'VERIFIED' && <span className="ml-1 text-emerald-600">✓</span>}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Comments */}
              {evaluations.some((ev) => ev.comment) && (
                <div className="mt-5 space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700">Сэтгэгдлүүд</h3>
                  {evaluations.filter((ev) => ev.comment).map((ev, i) => (
                    <div key={i} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <p className="text-xs font-semibold text-slate-600 mb-0.5">{ev.evaluatorName}</p>
                      <p className="text-sm text-slate-700">{ev.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* No evaluation yet, or (sender) not yet released by the manager */}
          {!isConclusion && (evaluations.length === 0 || !scoresVisible) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">
                {evaluations.length === 0
                  ? 'Үнэлгээ одоогоор өгөгдөөгүй байна.'
                  : 'Тайлан хянагдаж байна. Менежер баталгаажуулсны дараа үнэлгээний дүн харагдана.'}
              </p>
            </div>
          )}

          {/* Final Score */}
          {!isConclusion && displayFinalScore !== null && scoresVisible && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Эцсийн дундаж оноо</p>
              <p className="text-3xl font-bold text-color-primary">{formatScore(displayFinalScore)}</p>
            </div>
          )}

          {/* Back + (for a returned report) Fix */}
          <div className="flex justify-end gap-3">
            {isSenderView && !isConclusion && report.status === 'needs_revision' && (
              <a href={`/sender/submit?edit=${report.id}`} className="h-10 px-5 rounded-xl border border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition inline-flex items-center">
                Засах
              </a>
            )}
            <a href={backHref} className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
              Буцах
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
