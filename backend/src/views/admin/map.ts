import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { resolveReportPointLocations } from '@shared/map/locationResolver';
import type { CompanyPoint } from '@shared/map/types';
import { defineView } from '../define';

async function fetchData() {
  // Every report location that actually has coordinates, with the company
  // that submitted it and its review outcome (for search/filter/score color).
  return dataStore.reportLocation.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
      // Senders' unsent drafts are private to them.
      report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE }, status: { not: 'draft' } },
    },
    include: { report: { include: { senderCompany: true, reportType: true } } },
  });
}

export default defineView({
  name: 'admin/map',
  roles: ['admin'],
  async load() {
    const locations = await fetchData();
    const reports = await attachEffectiveSenderCompanies(
      locations.map((loc) => loc.report).filter(Boolean),
    );
    const reportById = new Map(reports.map((report) => [report.id, report]));
    const points: CompanyPoint[] = locations.map((loc) => {
      const report = loc.report ? reportById.get(loc.report.id) || loc.report : null;
      return {
        id: report?.id ?? loc.id,
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

    return { points: await resolveReportPointLocations(points) };
  },
});
