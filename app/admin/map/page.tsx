import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import type { CompanyPoint } from '@/components/CompanyMap';
import { adminNavItems } from '@/lib/adminNav';

async function fetchData() {
  // Every report location that actually has coordinates, with the company
  // that submitted it and its review outcome (for search/filter/score color).
  return prisma.reportLocation.findMany({
    where: { latitude: { not: null }, longitude: { not: null } },
    include: { report: { include: { senderCompany: true, reportType: true } } },
  });
}

export default async function AdminMapPage() {
  const locations = await fetchData();

  const points: CompanyPoint[] = locations.map((loc: any) => ({
    id: loc.report?.id ?? loc.id,
    lat: loc.latitude as number,
    lng: loc.longitude as number,
    company: loc.report?.senderCompany?.name ?? '-',
    register: loc.report?.senderCompany?.registerNumber ?? '-',
    reportNumber: loc.report?.reportNumber ?? '-',
    reportType: loc.report?.reportType?.name ?? '-',
    location: loc.addressDetail ?? '',
    status: loc.report?.status ?? 'draft',
    score: loc.report?.finalScore ?? null,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={adminNavItems('map')} role="admin" />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
        <main className="w-full p-6">
          <div className="mb-4 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Газрын зураг</h2>
            <p className="text-sm text-slate-500">
              Байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
            style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}
          >
            <CompanyMapSection points={points} />
          </div>
        </main>
      </div>
    </div>
  );
}
