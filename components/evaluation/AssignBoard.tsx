'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import StatusBadge from '@/components/ui/StatusBadge';
import { HiUserGroup } from 'react-icons/hi';
import AssignDialog from '@/components/evaluation/AssignDialog';

type Staff = {
  id: string;
  name: string;
  position: string | null;
  email: string;
  phone: string | null;
  assignedCount: number;
};

type Report = {
  id: string;
  reportNumber: string;
  title: string;
  reportTypeName: string;
  senderName: string;
  status: string;
  assignees: { id: string; name: string }[];
};

export default function AssignBoard({ reports, staff }: { reports: Report[]; staff: Staff[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeReport, setActiveReport] = useState<Report | null>(null);

  const openAssign = (report: Report) => setActiveReport(report);

  // When the manager arrives from the dashboard's "Гишүүдэд оноох" button
  // (/reviewer/assign?report=<id>), open the assign modal for that report once.
  const requestedReportId = searchParams.get('report');
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!requestedReportId || autoOpenedRef.current) return;
    const target = reports.find((r) => r.id === requestedReportId);
    if (target) {
      autoOpenedRef.current = true;
      openAssign(target);
      // Strip the ?report= param so a later refresh (e.g. after assigning)
      // doesn't reopen the modal on the screen over and over.
      router.replace('/reviewer/assign', { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedReportId, reports]);

  return (
    <div className="space-y-6">
      {/* Members (гишүүд) */}
      <section className="bg-white border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <HiUserGroup size={18} className="text-color-primary" />
          <h2 className="text-base font-semibold text-slate-900">
            Гишүүд <span className="text-slate-400 font-normal">({staff.length})</span>
          </h2>
        </div>
        {staff.length === 0 ? (
          <p className="text-sm text-slate-400">Бүртгэлтэй гишүүн алга байна.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {staff.map((member, index) => (
              <Link
                key={member.id}
                href={`/reviewer/staff/${member.id}`}
                className="flex items-center gap-3 border border-slate-200 p-3 transition hover:border-teal-300 hover:bg-teal-50/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-color-primary text-sm font-bold text-white">
                  {member.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-800 truncate">
                    {index + 1}. {member.name}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{member.position || 'Үнэлэгч'}</p>
                </div>
                <span className="shrink-0 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                  {member.assignedCount} тайлан
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Reports to distribute (тайлангууд) */}
      <section className="bg-white border border-slate-200 p-6">
        <h2 className="text-base font-semibold text-slate-900 mb-4">
          Хуваарилах тайлангууд <span className="text-slate-400 font-normal">({reports.length})</span>
        </h2>
        {reports.length === 0 ? (
          <p className="text-sm text-slate-400">Хуваарилах тайлан алга байна.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-3 px-3">Дугаар</th>
                  <th className="py-3 px-3">Төрөл</th>
                  <th className="py-3 px-3">Төслийн нэр</th>
                  <th className="py-3 px-3">Илгээгч</th>
                  <th className="py-3 px-3">Төлөв</th>
                  <th className="py-3 px-3">Оноосон гишүүд</th>
                  <th className="py-3 px-3 text-right">Үйлдэл</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-semibold text-slate-900">{report.reportNumber}</td>
                    <td className="py-3 px-3 text-slate-700">{report.reportTypeName}</td>
                    <td className="py-3 px-3 text-slate-700">{report.title}</td>
                    <td className="py-3 px-3 text-slate-700">{report.senderName}</td>
                    <td className="py-3 px-3"><StatusBadge status={report.status} /></td>
                    <td className="py-3 px-3 text-slate-600">
                      {report.assignees.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <span className="text-xs">{report.assignees.map((a) => a.name).join(', ')}</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openAssign(report)}
                        className="inline-flex items-center bg-color-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-color-primary-dark transition whitespace-nowrap"
                      >
                        {report.assignees.length > 0 ? 'Дахин оноох' : 'Оноох'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {activeReport && (
        <AssignDialog
          report={activeReport}
          staff={staff}
          assigneeIds={Array.from(new Set(activeReport.assignees.map((a) => a.id)))}
          onClose={() => setActiveReport(null)}
        />
      )}
    </div>
  );
}
