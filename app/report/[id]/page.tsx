import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';

type Props = {
  params: { id: string };
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

export default async function ReportDetailPage({ params }: Props) {
  const [report, criteria] = await Promise.all([
    fetchReportDetail(params.id),
    fetchCriteria(),
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

  const displayStatus = report.status === 'approved' ? 'completed' : report.status === 'assigned' ? 'submitted' : report.status;

  return (
    <div className="min-h-screen bg-[#EDF5FA]">
      <Header userName="Илгээх хэрэглэгч" companyName="Илгээх байгууллага" companyType="sender" />
      <div className="flex">
        <Sidebar items={[
          { label: 'Хяналтын самбар', href: '/sender' },
          {
            label: 'Тайлан илгээх',
            href: '/sender/submit',
            children: [
              { label: 'Жилийн төлөвлөгөө', href: '/sender/submit' },
              { label: 'Биелэлтийн тайлан', href: '/sender/submit' },
              { label: 'Дүгнэх хуудас', href: '/sender/submit' },
              { label: 'Хяналтын хуудас', href: '/sender/submit' },
              { label: 'Нэмэлт мэдээлэл', href: '/sender/submit' },
              { label: 'Аймаг, нийслэлийн санал', href: '/sender/submit' },
            ],
          },
          { label: 'Миний тайлангууд', href: '/sender' },
          { label: 'Ноорог', href: '/sender/drafts' },
          { label: 'Үнэлгээний хариу', href: '/sender' },
        ]} />

        <main className="flex-1 min-w-0 p-6 space-y-5">
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
            </div>

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
              </div>
            )}
          </div>

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
              <p className="text-3xl font-bold text-color-primary">{report.finalScore.toFixed(1)}</p>
            </div>
          )}

          {/* Back */}
          <div className="flex justify-end">
            <a href="/sender" className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
              Буцах
            </a>
          </div>
        </main>
      </div>
    </div>
  );
}
