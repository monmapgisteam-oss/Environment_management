import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import AttachmentList from '@/components/AttachmentList';
import ManagerReturnPanel from '@/components/ManagerReturnPanel';
import SurveyInfoCard from '@/components/SurveyInfoCard';
import LocationMap from '@/components/LocationMapClient';
import ScanPrintPanel from '@/components/ScanPrintPanel';
import SignatureBadge from '@/components/SignatureBadge';
import { parseAttachments, downloadUrl } from '@/lib/attachments';
import { signAttachments, createSignedUrl } from '@/lib/supabase';
import { formatDate, formatScore } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import { fetchSurveyInfoByRegister } from '@/lib/arcgis';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ role?: string }>;
};

async function fetchReportDetail(reportId: string) {
  return prisma.report.findUnique({
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
  const isReviewer = searchParams.role === 'reviewer';
  const isStaff = searchParams.role === 'staff';

  const [report, criteria, reportTypes] = await Promise.all([
    fetchReportDetail(params.id),
    fetchCriteria(),
    isReviewer ? fetchReportTypes() : Promise.resolve([]),
  ]);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  // Surface the company's own Survey123 submission, matched by register
  // number — reviewer-side only (manager + staff), since the sender already
  // knows their own information and shouldn't see it echoed back.
  const surveyRegister = report.implementerRegister || report.senderCompany?.registerNumber || '';
  const surveyInfo = (isReviewer || isStaff) ? await fetchSurveyInfoByRegister(surveyRegister) : null;

  // A staff member viewing the report may only see their OWN evaluation, never
  // their colleagues'. Managers and the sender see every evaluator's scores.
  const currentUser = isStaff ? await getCurrentUser() : null;

  const evaluations = report.assignments
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

  // Staff this report was distributed to, with whether each has scored it yet.
  const assignedStaff = report.assignments.map((a: any) => ({
    name: a.evaluator.name,
    position: a.evaluator.position,
    submitted: !!a.evaluation,
  }));

  const isSenderView = !isReviewer && !isStaff;
  const viewerRole: 'sender' | 'manager' | 'staff' = isReviewer ? 'manager' : isStaff ? 'staff' : 'sender';
  let displayStatus = report.status === 'approved' ? 'completed' : report.status === 'assigned' ? 'submitted' : report.status;
  // "return_requested" is an internal staff→manager step; the sender should still
  // see the report as under review until the manager actually returns it.
  if (isSenderView && report.status === 'return_requested') displayStatus = 'in_review';

  const attachments = await signAttachments(parseAttachments(report.fileUrl));
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
        { label: 'Судалгаа хайх', href: '/reviewer/survey' },
        { label: 'Буцаасан тайлан', href: '/reviewer' },
        { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
      ]
    : isStaff
    ? [
        { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
        { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
        { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
        { label: 'Судалгаа хайх', href: '/evaluator/survey' },
      ]
    : [
        { label: 'Хяналтын самбар', href: '/sender' },
        {
          label: 'Тайлан илгээх',
          href: '/sender/submit',
          children: [
            { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
            { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
          ],
        },
        { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
        { label: 'Миний тайлангууд', href: '/sender/reports' },
        { label: 'Газарзүйн мэдээлэл', href: '/sender/geography' },
        { label: 'Ноорог', href: '/sender/drafts' },
      ];

  const backHref = isReviewer ? '/reviewer' : isStaff ? '/evaluator' : '/sender';

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

          {/* Company's own Survey123 submission — auto-matched by register number, top of screen. */}
          <SurveyInfoCard info={surveyInfo} />

          {/* Manager sees which staff this report was distributed to (top). */}
          {isReviewer && (
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
                <p className="text-xs text-slate-500 mb-0.5">Тайлангийн дугаар</p>
                <h1 className="text-xl font-bold text-slate-900">{report.reportNumber}</h1>
              </div>
              <StatusBadge status={displayStatus} />
            </div>

            <div className="grid grid-cols-2 gap-x-8 gap-y-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs">Төслийн нэр</p>
                <p className="font-medium text-slate-800 mt-0.5">{report.title}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Тайлангийн төрөл</p>
                <p className="font-medium text-slate-800 mt-0.5">{report.reportType.name}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Илгээсэн байгууллага</p>
                <p className="font-medium text-slate-800 mt-0.5">{report.senderCompany?.name}</p>
              </div>
              <div>
                <p className="text-slate-500 text-xs">Илгээсэн огноо</p>
                <p className="font-medium text-slate-800 mt-0.5">{formatDate(report.submittedAt)}</p>
              </div>
              {report.implementerName && (
                <div>
                  <p className="text-slate-500 text-xs">Төсөл хэрэгжүүлэгчийн нэр</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.implementerName}</p>
                </div>
              )}
              {report.implementerRegister && (
                <div>
                  <p className="text-slate-500 text-xs">Төсөл хэрэгжүүлэгчийн РД</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.implementerRegister}</p>
                </div>
              )}
              {report.approvedDate && (
                <div>
                  <p className="text-slate-500 text-xs">Тайлан батлагдсан огноо</p>
                  <p className="font-medium text-slate-800 mt-0.5">{formatDate(report.approvedDate)}</p>
                </div>
              )}
              {report.hasGreenery != null && (
                <div>
                  <p className="text-slate-500 text-xs">Ногоон байгууламжтай эсэх</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.hasGreenery ? 'Тийм' : 'Үгүй'}</p>
                </div>
              )}
              {report.hasGreenery && report.treeCount != null && (
                <div>
                  <p className="text-slate-500 text-xs">Тарьсан мод</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.treeCount}</p>
                </div>
              )}
              {report.spentAmount != null && (
                <div>
                  <p className="text-slate-500 text-xs">Зарцуулсан дүн</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.spentAmount.toLocaleString()}₮</p>
                </div>
              )}
            </div>

            {report.description && (
              <div className="mt-5 pt-5 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs">Тайлбар</p>
                <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{report.description}</p>
              </div>
            )}

            {report.location && (report.location.addressDetail || (report.location.latitude != null && report.location.longitude != null)) && (
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
          {isSenderView && report.status === 'needs_revision' && report.returnReason && (
            <div className="bg-white rounded-2xl border border-orange-200 p-6">
              <p className="text-sm font-semibold text-orange-700">Тайлан засвар шаардсан байна</p>
              <p className="mt-1 text-sm text-slate-700">Шалтгаан: {report.returnReason}</p>
            </div>
          )}

          {/* Manager controls: confirm/dismiss a staff return request, or return
              the report to the sender directly. */}
          {isReviewer && (
            <ManagerReturnPanel
              reportId={report.id}
              status={report.status}
              returnReason={report.returnReason}
              returnRequestedBy={report.returnRequestedBy}
            />
          )}

          {/* Attachments */}
          {attachments.length > 0 && <AttachmentList attachments={attachments} />}

          {/* Evaluation Scores Table */}
          {evaluations.length > 0 && scoresVisible && (
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
          {(evaluations.length === 0 || !scoresVisible) && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">
                {evaluations.length === 0
                  ? 'Үнэлгээ одоогоор өгөгдөөгүй байна.'
                  : 'Тайлан хянагдаж байна. Менежер баталгаажуулсны дараа үнэлгээний дүн харагдана.'}
              </p>
            </div>
          )}

          {/* Final Score */}
          {report.finalScore !== null && scoresVisible && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Эцсийн дундаж оноо</p>
              <p className="text-3xl font-bold text-color-primary">{formatScore(report.finalScore)}</p>
            </div>
          )}

          {/* Back + (for a returned report) Fix */}
          <div className="flex justify-end gap-3">
            {isSenderView && report.status === 'needs_revision' && (
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
