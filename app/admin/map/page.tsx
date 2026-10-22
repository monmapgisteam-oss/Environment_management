import PageHeader from '@/components/layout/PageHeader';
import dataStore from '@/lib/db';
import CompanyMapSection from '@/components/map/CompanyMapSection';
import type { CompanyPoint } from '@/components/map/CompanyMap';
import { fetchSurveyMapPoints } from '@/lib/map/surveyMapPoints';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { resolveReportPointLocations } from '@/lib/map/locationResolver';

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
    locations.map((loc) => loc.report).filter(Boolean),
  );
  const reportById = new Map(reports.map((report) => [report.id, report]));
  const locationsByRegister: Record<string, { province?: string | null; district?: string | null }> = {};
  locations.forEach((loc) => {
    const report = loc.report ? reportById.get(loc.report.id) || loc.report : null;
    const register = (report?.implementerRegister || report?.senderCompany?.registerNumber || '').trim();
    if (!register) return;
    locationsByRegister[register.toUpperCase()] = {
      province: loc.province,
      district: loc.district,
    };
  });
  const points: CompanyPoint[] = locations.map((loc) => {
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
    <main className="flex-1 min-w-0 space-y-6 px-6 py-7 lg:px-8">
      <PageHeader title="Газрын зураг" subtitle="Байгууллагуудын байршил, хяналтын үнэлгээгээр өнгөөр ялгасан." />

      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft"
        style={{ height: 'calc(100vh - 220px)', minHeight: 480 }}
      >
        <CompanyMapSection points={allPoints} />
      </div>
    </main>
  );
}
