import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import AttachmentList from '@/components/AttachmentList';
import ManagerReturnPanel from '@/components/ManagerReturnPanel';
import { parseAttachments } from '@/lib/attachments';
import { signAttachments } from '@/lib/supabase';
import { formatDate, formatScore } from '@/lib/utils';

type Props = {
  params: { id: string };
  searchParams: { role?: string };
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

export default async function ReportDetailPage({ params, searchParams }: Props) {
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

  const evaluations = report.assignments
    .filter((a: any) => a.evaluation)
    .map((a: any) => ({
      evaluatorName: a.evaluator.name,
      totalScore: a.evaluation.totalScore,
      comment: a.evaluation.comment,
      scores: a.evaluation.scores,
    }));

  // Staff this report was distributed to, with whether each has scored it yet.
  const assignedStaff = report.assignments.map((a: any) => ({
    name: a.evaluator.name,
    position: a.evaluator.position,
    submitted: !!a.evaluation,
  }));

  const isSenderView = !isReviewer && !isStaff;
  let displayStatus = report.status === 'approved' ? 'completed' : report.status === 'assigned' ? 'submitted' : report.status;
  // "return_requested" is an internal staff→manager step; the sender should still
  // see the report as under review until the manager actually returns it.
  if (isSenderView && report.status === 'return_requested') displayStatus = 'in_review';

  const attachments = await signAttachments(parseAttachments(report.fileUrl));

  const sidebarItems = isReviewer
    ? [
        { label: 'Хяналтын самбар', href: '/reviewer' },
        {
          label: 'Ирсэн тайлангууд',
          href: '/reviewer/reports',
          children: reportTypes.map((rt: any) => ({
            label: rt.name,
            href: `/reviewer/reports?type=${rt.slug}`,
          })),
        },
        { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
        { label: 'Буцаасан тайлан', href: '/reviewer' },
      ]
    : isStaff
    ? [
        { label: 'Удирдлагын хуудас', href: '/evaluator' },
        { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
        { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
      ]
    : [
        { label: 'Хяналтын самбар', href: '/sender' },
        {
          label: 'Тайлан илгээх',
          href: '/sender/submit',
          children: [
            { label: 'Жилийн төлөвлөгөө', href: '/sender/submit?type=plan' },
            { label: 'Биелэлтийн тайлан', href: '/sender/submit?type=performance' },
            { label: 'Дүгнэх хуудас', href: '/sender/submit?type=summary' },
            { label: 'Хяналтын хуудас', href: '/sender/submit?type=control' },
            { label: 'Аймаг, нийслэлийн санал', href: '/sender/submit?type=regional' },
          ],
        },
        { label: 'Нэмэлт мэдээлэл', href: '/sender/submit?type=additional' },
        { label: 'Миний тайлангууд', href: '/sender' },
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
            </div>

            {report.description && (
              <div className="mt-5 pt-5 border-t border-slate-100 text-sm">
                <p className="text-slate-500 text-xs">Тайлбар</p>
                <p className="font-medium text-slate-800 mt-0.5 whitespace-pre-wrap">{report.description}</p>
              </div>
            )}

            {report.location && (
              <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-slate-500 text-xs">Аймаг</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.location.province}</p>
                </div>
                <div>
                  <p className="text-slate-500 text-xs">Сум / Дүүрэг</p>
                  <p className="font-medium text-slate-800 mt-0.5">{report.location.district}</p>
                </div>
                {report.location.khoroo && (
                  <div>
                    <p className="text-slate-500 text-xs">Баг / Хороо</p>
                    <p className="font-medium text-slate-800 mt-0.5">{report.location.khoroo}</p>
                  </div>
                )}
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
                      <iframe
                        title="Тайлангийн байршил"
                        className="w-full h-full"
                        loading="lazy"
                        src={`https://www.openstreetmap.org/export/embed.html?bbox=${report.location.longitude - 0.01}%2C${report.location.latitude - 0.01}%2C${report.location.longitude + 0.01}%2C${report.location.latitude + 0.01}&layer=mapnik&marker=${report.location.latitude}%2C${report.location.longitude}`}
                      />
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
          {evaluations.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h2 className="text-base font-semibold text-slate-900 mb-5">Үнэлгээний дүн</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
                      <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">Авбал зохих оноо</th>
                      {evaluations.map((ev, i) => (
                        <th key={i} className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">{ev.evaluatorName}</th>
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
                        <td key={i} className="py-3 px-4 text-center font-bold text-color-primary text-lg">{ev.totalScore}</td>
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

          {/* No evaluation yet */}
          {evaluations.length === 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center">
              <p className="text-sm text-slate-500">Үнэлгээ одоогоор өгөгдөөгүй байна.</p>
            </div>
          )}

          {/* Final Score */}
          {report.finalScore !== null && (
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
