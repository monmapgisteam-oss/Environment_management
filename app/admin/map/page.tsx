import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import type { CompanyPoint } from '@/components/CompanyMap';

async function fetchData() {
  const [locations, companies] = await Promise.all([
    // Every report location that actually has coordinates, with the company
    // that submitted it (for the register number shown on the map).
    prisma.reportLocation.findMany({
      where: { latitude: { not: null }, longitude: { not: null } },
      include: { report: { include: { senderCompany: true, reportType: true } } },
    }),
    prisma.company.findMany({ select: { registerNumber: true, name: true } }),
  ]);
  return { locations, companies };
}

export default async function AdminMapPage() {
  const { locations, companies } = await fetchData();

  const points: CompanyPoint[] = locations.map((loc: any) => ({
    lat: loc.latitude as number,
    lng: loc.longitude as number,
    company: loc.report?.senderCompany?.name ?? '-',
    register: loc.report?.senderCompany?.registerNumber ?? '-',
    reportNumber: loc.report?.reportNumber ?? '-',
    reportType: loc.report?.reportType?.name ?? '-',
    location: [loc.province, loc.district, loc.khoroo].filter(Boolean).join(', '),
  }));

  const companyByRegister: Record<string, string> = {};
  companies.forEach((c: any) => {
    companyByRegister[c.registerNumber.trim()] = c.name;
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        items={[
          { label: 'Удирдлагын хуудас', href: '/admin' },
          { label: 'Компаниуд', href: '/admin' },
          { label: 'Хэрэглэгчид', href: '/admin' },
          { label: 'Бүх тайлан', href: '/admin' },
          { label: 'Бүх үнэлгээ', href: '/admin' },
          { label: 'Газрын зураг', href: '/admin/map', active: true },
          { label: 'Тайлангийн төрөл', href: '/admin' },
          { label: 'Үнэлгээний шалгуур', href: '/admin' },
          { label: 'Тохиргоо', href: '/admin' },
        ]}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Систем админ" companyName="Системийн удирдлага" role="admin" />
        <main className="w-full p-6">
          <div className="mb-4 space-y-1">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Газрын зураг</h2>
            <p className="text-sm text-slate-500">
              Байгууллагуудын байршил (регистрийн дугаараар) болон Survey123 судалгааны цэгүүд.
            </p>
          </div>

          <div
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
            style={{ height: 'calc(100vh - 220px)', minHeight: 420 }}
          >
            <CompanyMapSection points={points} companyByRegister={companyByRegister} />
          </div>
        </main>
      </div>
    </div>
  );
}
