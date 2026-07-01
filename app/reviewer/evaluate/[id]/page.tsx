import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import EvaluationTable from '@/components/EvaluationTable';
import AttachmentList from '@/components/AttachmentList';
import { parseAttachments } from '@/lib/attachments';
import { signAttachments } from '@/lib/supabase';

type Props = {
  params: { id: string };
};

async function fetchReport(id: string) {
  return prisma.report.findUnique({
    where: { id },
    include: {
      reportType: true,
      senderCompany: true,
      evaluations: {
        include: {
          scores: true,
        },
        orderBy: { createdAt: 'desc' },
        take: 1,
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

export default async function ReviewerEvaluatePage({ params }: Props) {
  const [report, criteria, reportTypes] = await Promise.all([
    fetchReport(params.id),
    fetchCriteria(),
    fetchReportTypes(),
  ]);

  if (!report) {
    return <div className="p-8 text-center text-slate-500">Тайлан олдсонгүй.</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
          items={[
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
            { label: 'Буцаасан тайлан', href: '/reviewer' },
            { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
          ]}
        />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
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

          {/* Attached documents the sender submitted */}
          <AttachmentList attachments={await signAttachments(parseAttachments(report.fileUrl))} />

          {/* Evaluation Table */}
          <EvaluationTable
            criteria={criteria.map((c: any) => ({
              id: c.id,
              name: c.name,
              maxScore: c.maxScore,
              sortOrder: c.sortOrder,
            }))}
            reportId={report.id}
            savedScores={
              report.evaluations?.[0]?.scores?.reduce((acc: Record<string, string>, s: any) => {
                acc[s.criterionId] = String(s.score);
                return acc;
              }, {}) || null
            }
            savedComment={report.evaluations?.[0]?.comment || null}
            savedSignature={report.evaluations?.[0]?.signature || null}
          />
        </main>
      </div>
    </div>
  );
}
