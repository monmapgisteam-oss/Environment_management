import Link from 'next/link';
import dataStore from '@/lib/db';
import StatusBadge from '@/components/ui/StatusBadge';
import { formatDate } from '@/lib/utils';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { createQrImageUrl, getPublicProfileQrUrl } from '@/lib/auth/profileQr';

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchStaffMember(id: string) {
  return dataStore.user.findFirst({
    where: { id, role: 'evaluator' },
    include: {
      company: { select: { name: true } },
      evaluatorAssignments: {
        where: { report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } } },
        include: {
          report: { select: { id: true, reportNumber: true, title: true, status: true } },
          evaluation: { select: { totalScore: true } },
        },
        orderBy: { assignedAt: 'desc' },
      },
    },
  });
}

export default async function StaffProfilePage(props: Props) {
  const params = await props.params;
  const member = await fetchStaffMember(params.id);
  const staffWorkplace = member?.company?.name || 'Ажлын газар бүртгэгдээгүй';
  const staffQrUrl = member ? await createQrImageUrl(await getPublicProfileQrUrl(member.id)) : '';


  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      {!member ? (
        <div className="bg-white border border-slate-200 p-6 text-center text-sm text-slate-500">
          Гишүүн олдсонгүй.
        </div>
      ) : (
        <>
          <div className="overflow-hidden border border-slate-200 bg-white">
            <div className="grid gap-0 lg:grid-cols-[1fr_320px]">
              <div className="p-6">
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
                    <p className="text-slate-500 text-xs">Ажлын газар</p>
                    <p className="font-medium text-slate-800 mt-0.5">{staffWorkplace}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 text-xs">Оноогдсон тайлангийн тоо</p>
                    <p className="font-medium text-slate-800 mt-0.5">{member.evaluatorAssignments.length}</p>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50 px-6 py-6 lg:border-l lg:border-t-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">QR код</p>
                <div className="mt-4 flex flex-col items-start gap-4">
                  <img
                    src={staffQrUrl}
                    alt="Хувийн мэдээлэл агуулсан QR код"
                    className="h-[220px] w-[220px] border border-slate-200 bg-white p-3 shadow-sm"
                  />
                  <p className="text-sm leading-6 text-slate-500">
                    QR код нь нэр, албан тушаал, ажлын газар, утасны дугаар бүхий хуудас руу холбоно.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-6">
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
                    {member.evaluatorAssignments.map((a) => (
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
        <Link href="/reviewer/assign" className="h-10 px-5 border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50 transition inline-flex items-center">
          Буцах
        </Link>
      </div>
    </main>
  );
}
