import Link from 'next/link';
import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/utils';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchStaffMember(id: string) {
  return prisma.user.findFirst({
    where: { id, role: 'evaluator' },
    include: {
      evaluatorAssignments: {
        include: {
          report: { select: { id: true, reportNumber: true, title: true, status: true } },
          evaluation: { select: { totalScore: true } },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });
}

async function fetchReportTypes() {
  return prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export default async function StaffProfilePage(props: Props) {
  const params = await props.params;
  const [member, reportTypes] = await Promise.all([fetchStaffMember(params.id), fetchReportTypes()]);

  const sidebarChildren = reportTypes
    .filter((rt: any) => rt.slug !== 'type-5')
    .map((rt: any) => ({
      label: rt.name,
      href: `/reviewer/reports?type=${rt.slug}`,
    }));

  const sidebarItems = [
    { label: 'Хяналтын самбар', href: '/reviewer' },
    { label: 'Ирсэн тайлангууд', href: '/reviewer/reports', children: sidebarChildren },
    { label: 'Үнэлгээний явц', href: '/reviewer/evaluation-progress' },
    { label: 'Газарзүйн мэдээлэл', href: '/reviewer/geography' },
    { label: 'Судалгаа хайх', href: '/reviewer/survey' },
    { label: 'Буцаасан тайлан', href: '/reviewer' },
    { label: 'Нэмэлт мэдээ', href: '/reviewer/reports?type=type-5' },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={sidebarItems} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хянах менежер" companyName="Хянах байгууллага" companyType="reviewer" />
        <main className="flex-1 min-w-0 space-y-5 p-6">
          {!member ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center text-sm text-slate-500">
              Гишүүн олдсонгүй.
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-color-primary text-xl font-bold text-white">
                    {member.name.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-xl font-bold text-slate-900 truncate">{member.name}</h1>
                    <p className="text-sm text-slate-500">{member.position || 'Үнэлгээний ажилтан'}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-100 pt-5 text-sm sm:grid-cols-2">
                  <div>
                    <p className="text-slate-500 text-xs">И-мэйл</p>
                    <p className="font-medium text-slate-800 mt-0.5">{member.email}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Утасны дугаар</p>
                    <p className="font-medium text-slate-800 mt-0.5">{member.phone || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Албан тушаал</p>
                    <p className="font-medium text-slate-800 mt-0.5">{member.position || '-'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Оноогдсон тайлангийн тоо</p>
                    <p className="font-medium text-slate-800 mt-0.5">{member.evaluatorAssignments.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-6">
                <h2 className="text-base font-semibold text-slate-900 mb-4">
                  Оноогдсон тайлангууд <span className="text-slate-400 font-normal">({member.evaluatorAssignments.length})</span>
                </h2>
                {member.evaluatorAssignments.length === 0 ? (
                  <p className="text-sm text-slate-400">Одоогоор тайлан оноогдоогүй байна.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                          <th className="py-3 px-3">Дугаар</th>
                          <th className="py-3 px-3">Төслийн нэр</th>
                          <th className="py-3 px-3">Төлөв</th>
                          <th className="py-3 px-3">Хугацаа</th>
                          <th className="py-3 px-3">Оноо</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {member.evaluatorAssignments.map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-50">
                            <td className="py-3 px-3 font-semibold text-slate-900">{a.report.reportNumber}</td>
                            <td className="py-3 px-3 text-slate-700">{a.report.title}</td>
                            <td className="py-3 px-3"><StatusBadge status={a.status === 'submitted' ? 'completed' : 'in_review'} /></td>
                            <td className="py-3 px-3 text-slate-600">{a.deadline ? formatDate(a.deadline) : '-'}</td>
                            <td className="py-3 px-3 font-medium text-color-primary">{a.evaluation?.totalScore ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}

          <div className="flex justify-end">
            <Link href="/reviewer/assign" className="h-10 px-5 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
              Буцах
            </Link>
          </div>
        </main>
      </div>
    </div>
  );
}
