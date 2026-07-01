import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import EvaluationTable from '@/components/EvaluationTable';
import AttachmentList from '@/components/AttachmentList';
import StaffReturnButton from '@/components/StaffReturnButton';
import { parseAttachments } from '@/lib/attachments';
import { signAttachments } from '@/lib/supabase';
import { formatDate } from '@/lib/utils';

type Props = {
  params: { id: string };
};

async function fetchCriteria() {
  return prisma.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export default async function StaffEvaluatePage({ params }: Props) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'evaluator') {
    redirect('/login/reviewer');
  }

  // A staff member may only score a report the manager assigned to them.
  const assignment = await prisma.reportAssignment.findFirst({
    where: { reportId: params.id, evaluatorUserId: user.id },
    include: {
      report: { include: { reportType: true, senderCompany: true, location: true } },
      evaluation: { include: { scores: true } },
    },
  });

  if (!assignment) {
    return (
      <div className="min-h-screen bg-background">
        <Header userName={user.name} companyName="Хянах байгууллага" role="staff" />
        <div className="p-8 text-center text-slate-500">Танд энэ тайлан оноогдоогүй байна.</div>
      </div>
    );
  }

  const report = assignment.report;
  const criteria = await fetchCriteria();

  // Each staff member only ever sees their own scoring — other evaluators'
  // scores are deliberately not loaded here.
  const savedScores =
    assignment.evaluation?.scores?.reduce((acc: Record<string, string>, s: any) => {
      acc[s.criterionId] = String(s.score);
      return acc;
    }, {}) || null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator', active: true },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
            { label: 'Газарзүйн мэдээлэл', href: '/evaluator/geography' },
            { label: 'Нэмэлт мэдээлэл', href: '/evaluator?type=type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName={user.name} companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 p-6 space-y-6">
          {/* Report info */}
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

            {/* Deadline the manager set when distributing this report */}
            {assignment.deadline && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-sm text-amber-800">
                  <span className="font-medium">Хүлээлгэх хугацаа:</span> {formatDate(assignment.deadline)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <span className="text-slate-500">Төслийн нэр: </span>
                <span className="font-medium text-slate-800">{report.title}</span>
              </div>
              <div>
                <span className="text-slate-500">Байгууллага: </span>
                <span className="font-medium text-slate-800">{report.senderCompany?.name || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Хэрэгжүүлэгч: </span>
                <span className="font-medium text-slate-800">{report.implementerName || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Хэрэгжүүлэгчийн РД: </span>
                <span className="font-medium text-slate-800">{report.implementerRegister || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Батлагдсан огноо: </span>
                <span className="font-medium text-slate-800">{formatDate(report.approvedDate)}</span>
              </div>
              <div>
                <span className="text-slate-500">Илгээсэн огноо: </span>
                <span className="font-medium text-slate-800">{formatDate(report.submittedAt)}</span>
              </div>
              <div>
                <span className="text-slate-500">Тайлангийн он: </span>
                <span className="font-medium text-slate-800">{report.year || '-'}</span>
              </div>
              <div>
                <span className="text-slate-500">Байршил: </span>
                <span className="font-medium text-slate-800">
                  {report.location?.latitude != null && report.location?.longitude != null
                    ? `${report.location.latitude.toFixed(6)}, ${report.location.longitude.toFixed(6)}`
                    : '-'}
                </span>
              </div>
              {report.location?.addressDetail && (
                <div>
                  <span className="text-slate-500">Дэлгэрэнгүй хаяг: </span>
                  <span className="font-medium text-slate-800">{report.location.addressDetail}</span>
                </div>
              )}
              {report.description && (
                <div className="col-span-2">
                  <span className="text-slate-500">Тайлбар: </span>
                  <span className="font-medium text-slate-800">{report.description}</span>
                </div>
              )}
            </div>
          </div>

          {/* Attached documents the sender submitted */}
          <AttachmentList attachments={await signAttachments(parseAttachments(report.fileUrl))} />

          {/* Scoring — staff see only their own column, never other evaluators'. */}
          <EvaluationTable
            criteria={criteria.map((c: any) => ({
              id: c.id,
              name: c.name,
              maxScore: c.maxScore,
              sortOrder: c.sortOrder,
            }))}
            reportId={report.id}
            savedScores={savedScores}
            savedComment={assignment.evaluation?.comment || null}
            savedSignature={assignment.evaluation?.signature || null}
            redirectTo="/evaluator"
            selfName={user.name}
            leftAction={
              <div className="flex flex-col items-start gap-1">
                <StaffReturnButton reportId={report.id} />
                <p className="text-sm text-slate-500">Менежерт буцаах хүсэлт илгээнэ үү.</p>
              </div>
            }
          />
        </main>
      </div>
    </div>
  );
}
