import prisma from '@/lib/prisma';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

async function fetchGeographyData() {
  const locations = await prisma.reportLocation.findMany({
    include: {
      report: true,
    },
  });
  return locations;
}

export default async function GeographyPage() {
  const locations = await fetchGeographyData();

  const groupedByLocation = locations.reduce(
    (acc: any, location: any) => {
      const key = `${location.province} - ${location.district}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(location);
      return acc;
    },
    {} as { [key: string]: typeof locations },
  );

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar items={[{ label: 'Буцах', href: '/' }]} />

        <div className="flex min-w-0 flex-1 flex-col">
        <Header userName="Хэрэглэгч" companyName="Байгууллага" />
        <main className="w-full p-6 lg:pl-0">
          <div className="rounded-3xl bg-white p-8 shadow-soft border border-slate-200">
            <h1 className="mb-2 text-2xl font-semibold text-slate-900">Газарзүйн мэдээлэл</h1>
            <p className="mb-6 text-sm text-slate-600">Байршилаар ангилагдсан тайлангууд</p>

            <div className="space-y-6">
              {Object.entries(groupedByLocation).map(([location, reports]: [string, any]) => (
                <div key={location} className="border-l-4 border-primary pl-4">
                  <h2 className="font-semibold text-slate-800 mb-3">{location}</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="bg-teal-50 rounded-3xl p-4">
                      <p className="text-sm text-slate-600">Тайлангийн тоо</p>
                      <p className="text-2xl font-semibold text-slate-900">{reports.length}</p>
                    </div>
                    <div className="bg-teal-50 rounded-3xl p-4">
                      <p className="text-sm text-slate-600">Дундаж оноо</p>
                      <p className="text-2xl font-semibold text-slate-900">
                        {reports.filter((r: any) => r.report.finalScore !== null).length > 0
                          ? (reports.filter((r: any) => r.report.finalScore !== null).reduce((sum: number, r: any) => sum + (r.report.finalScore ?? 0), 0) / reports.filter((r: any) => r.report.finalScore !== null).length).toFixed(1)
                          : '-'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
