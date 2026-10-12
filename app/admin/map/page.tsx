import dataStore from '@/lib/arcgis/data';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CompanyMapSection from '@/components/CompanyMapSection';
import type { CompanyPoint } from '@/components/CompanyMap';
import { adminNavItems } from '@/lib/adminNav';
import { fetchSurveyMapPoints } from '@/lib/surveyMapPoints';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';
import { resolveReportPointLocations } from '@/lib/locationResolver';

async function fetchData() {
  // Every report location that actually has coordinates, with the company
  // that submitted it and its review outcome (for search/filter/score color).
  return dataStore.reportLocation.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    },
    include: { report: { include: { senderCompany: true, reportType: true } } },
  });
}

export default async function AdminMapPage() {
  const locations = await fetchData();
  const reports = await attachEffectiveSenderCompanies(
    locations.map((loc: any) => loc.report).filter(Boolean),
  );
  const reportById = new Map(reports.map((report: any) => [report.id, report]));
  const locationsByRegister: Record<string, { province?: string | null; district?: string | null }> = {};
  locations.forEach((loc: any) => {
    const report = loc.report ? reportById.get(loc.report.id) || loc.report : null;
    const register = (report?.implementerRegister || report?.senderCompany?.registerNumber || '').trim();
    if (!register) return;
    locationsByRegister[register.toUpperCase()] = {
      province: loc.province,
      district: loc.district,
    };
  });
  const points: CompanyPoint[] = locations.map((loc: any) => {
    const report = loc.report ? reportById.get(loc.report.id) || loc.report : null;
    return {
      id: report?.id ?? loc.id,
      source: 'report',
      lat: loc.latitude as number,
      lng: loc.longitude as number,
      company: report?.senderCompany?.name ?? '-',
      register: report?.implementerRegister || report?.senderCompany?.registerNumber || '-',
      reportNumber: report?.reportNumber ?? '-',
      reportType: report?.reportType?.name ?? '-',
      location: loc.addressDetail ?? '',
      status: report?.status ?? 'draft',
      score: report?.finalScore ?? null,
      province: loc.province,
      district: loc.district,
    };
  });
  const resolvedPoints = await resolveReportPointLocations(points);
  resolvedPoints.forEach((point) => {
    if (!point.register) return;
    locationsByRegister[point.register.toUpperCase()] = {
      province: point.province,
      district: point.district,
    };
  });
  const surveyPoints = await fetchSurveyMapPoints({ locationsByRegister });
  const allPoints = [...resolvedPoints, ...surveyPoints];

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
            <CompanyMapSection points={allPoints} />
          </div>
        </main>
      </div>
    </div>
  );
}
