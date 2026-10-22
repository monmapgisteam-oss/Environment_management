import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import KpiStrip from '@/components/ui/KpiStrip';
import Panel, { PanelEmpty } from '@/components/ui/Panel';
import StatusBadge from '@/components/ui/StatusBadge';
import dataStore from '@/lib/db';
import ReportTable from '@/components/reports/ReportTable';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { formatDate } from '@/lib/utils';
import { HiOutlineCog, HiOutlineMap, HiOutlineOfficeBuilding, HiOutlineUser, HiOutlineViewGrid } from 'react-icons/hi';

async function fetchAdminReports() {
  const reports = await dataStore.report.findMany({
    where: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

export default async function AdminDashboard() {
  const [reports, companyCount, userCount, evaluatorCount] = await Promise.all([
    fetchAdminReports(),
    dataStore.company.count({ where: { type: 'sender' } }),
    dataStore.user.count({ where: { role: { not: 'admin' } } }),
    dataStore.user.count({ where: { role: 'evaluator' } }),
  ]);
  const year = new Date().getFullYear();
  const submitted = reports.filter((r) => r.status !== 'draft');
  const completed = submitted.filter((r) => ['completed', 'approved'].includes(r.status)).length;
  const thisYear = submitted.filter((r) => r.year === year);
  const byType = ['Жилийн', 'Биелэлт'].map((key) => ({
    key,
    label: key === 'Жилийн' ? 'Жилийн төлөвлөгөө' : 'Биелэлтийн тайлан',
    count: thisYear.filter((r) => r.reportType.name.includes(key)).length,
  }));
  const recent = submitted.slice(0, 6);
  const shortcuts = [
    { label: 'Компаниуд', note: `${companyCount} илгээгч`, href: '/admin/companies', icon: <HiOutlineOfficeBuilding size={18} /> },
    { label: 'Хэрэглэгчид', note: `${userCount} бүртгэл`, href: '/admin/users', icon: <HiOutlineUser size={18} /> },
    { label: 'Газрын зураг', note: 'Байршлууд', href: '/admin/map', icon: <HiOutlineMap size={18} /> },
    { label: 'Үнэлгээний шалгуур', note: 'Оноо, төрөл', href: '/admin/criteria', icon: <HiOutlineViewGrid size={18} /> },
    { label: 'Тохиргоо', note: 'Тайлангийн төрөл', href: '/admin/settings', icon: <HiOutlineCog size={18} /> },
  ];

  return (
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Удирдлагын хуудас" eyebrow="Системийн админ" subtitle="Тайлан, байгууллага, хэрэглэгчийн ерөнхий нэгтгэл" />

      <KpiStrip
        items={[
          { label: 'Нийт тайлан', value: submitted.length, note: `${thisYear.length} нь ${year} онд`, accent: 'bg-teal-600' },
          { label: 'Үнэлгээ дууссан', value: completed, note: submitted.length ? `Нийтийн ${Math.round((completed / submitted.length) * 100)}%` : '—', accent: 'bg-emerald-500' },
          { label: 'Илгээгч байгууллага', value: companyCount, note: 'Бүртгэлтэй', accent: 'bg-sky-500' },
          { label: 'Хэрэглэгч', value: userCount, note: `${evaluatorCount} үнэлгээний гишүүн`, accent: 'bg-violet-500' },
        ]}
      />

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Panel title="Сүүлийн тайлангууд" count={submitted.length}>
          {recent.length === 0 ? (
            <PanelEmpty>Тайлан ирээгүй байна.</PanelEmpty>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.map((report) => (
                <li key={report.id}>
                  <Link href={`/report/${report.id}?role=reviewer`} className="grid items-center gap-4 px-5 py-3.5 transition hover:bg-slate-50 sm:grid-cols-[140px_minmax(0,1fr)_auto]">
                    <span className="font-mono text-sm font-semibold text-slate-900">{report.reportNumber}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-800">{report.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {report.senderCompany?.name} · {report.reportType.name} · {formatDate(report.submittedAt)}
                      </span>
                    </span>
                    <StatusBadge status={report.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="space-y-6">
          <Panel title={`${year} оны тайлан`} subtitle="Төрлөөр">
            <ul className="divide-y divide-slate-100">
              {byType.map((type) => (
                <li key={type.key} className="px-5 py-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-800">{type.label}</span>
                    <span className="font-semibold text-slate-900">{type.count}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 bg-slate-100">
                    <div className="h-full bg-teal-600" style={{ width: `${thisYear.length ? (type.count / thisYear.length) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          </Panel>

          <div className="grid grid-cols-2 gap-px border border-slate-200 bg-slate-200 shadow-soft">
            {shortcuts.map((shortcut) => (
              <Link key={shortcut.href} href={shortcut.href} className="group flex items-center gap-3 bg-white px-4 py-3.5 transition hover:bg-slate-50">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center bg-slate-100 text-slate-500 transition group-hover:bg-teal-50 group-hover:text-teal-700">
                  {shortcut.icon}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-slate-800">{shortcut.label}</span>
                  <span className="block truncate text-[11px] text-slate-400">{shortcut.note}</span>
                </span>
              </Link>
            ))}
            {shortcuts.length % 2 === 1 && <span className="bg-white" />}
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-slate-900">Бүх тайлан</h2>
        <ReportTable
          reports={reports.map((report) => ({
            id: report.id,
            reportNumber: report.reportNumber,
            reportType: report.reportType,
            title: report.title,
            submittedAt: report.submittedAt?.toISOString() || null,
            status: report.status,
            finalScore: report.finalScore,
            senderCompany: report.senderCompany,
            location: report.location,
          }))}
        />
      </section>
    </main>
  );
}
