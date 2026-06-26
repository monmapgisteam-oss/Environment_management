import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import EvaluationTable from '@/components/EvaluationTable';
import AttachmentList from '@/components/AttachmentList';
import { parseAttachments } from '@/lib/attachments';

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
      report: { include: { reportType: true, senderCompany: true } },
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

  const savedScores =
    assignment.evaluation?.scores?.reduce((acc: Record<string, string>, s: any) => {
      acc[s.criterionId] = String(s.score);
      return acc;
    }, {}) || null;

  return (
    <div className="min-h-screen bg-background">
      <Header userName={user.name} companyName="Хянах байгууллага" companyType="reviewer" />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator', active: true },
            { label: 'Үнэлгээ өгсөн тайлангууд', href: '/evaluator/evaluated' },
          ]}
        />

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
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Төслийн нэр: </span>
                <span className="font-medium text-slate-800">{report.title}</span>
              </div>
              <div>
                <span className="text-slate-500">Байгууллага: </span>
                <span className="font-medium text-slate-800">{report.senderCompany?.name}</span>
              </div>
            </div>
          </div>

          {/* Attached documents the sender submitted */}
          <AttachmentList attachments={parseAttachments(report.fileUrl)} />

          {/* Scoring */}
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
            redirectTo="/evaluator"
          />
        </main>
      </div>
    </div>
  );
}
