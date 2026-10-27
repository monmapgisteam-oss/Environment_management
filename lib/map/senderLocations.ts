import dataStore from '@/lib/db';
import type { CompanyPoint } from '@/components/map/CompanyMap';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { resolveReportPointLocations } from '@/lib/map/locationResolver';
import { scoresReleased, senderStatus } from '@/lib/reports/scoreRelease';

/**
 * One pin per submitted report belonging to the given sender company — a
 * sender should only ever see their own organisation's locations, never
 * every company the way the reviewer's "Газарзүйн мэдээлэл" map does.
 */
export async function fetchSenderCompanyPoints(companyId: string): Promise<CompanyPoint[]> {
  const rawReports = await dataStore.report.findMany({
    where: {
      status: { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      OR: [{ senderCompanyId: companyId }, { implementerRegister: { not: null } }],
    },
    include: { senderCompany: true, reportType: true, location: true },
    orderBy: { submittedAt: 'desc' },
  });
  const reports = (await attachEffectiveSenderCompanies(rawReports)).filter(
    (report) => report.senderCompany?.id === companyId,
  );

  const points: CompanyPoint[] = [];

  for (const r of reports) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    const lat = r.location?.latitude;
    const lng = r.location?.longitude;
    if (lat == null || lng == null) continue;

    points.push({
      id: r.id,
      lat,
      lng,
      company: r.implementerName || r.senderCompany?.name || register || 'Байгууллага',
      register,
      reportNumber: r.reportNumber,
      reportType: r.reportType?.name || '',
      location: r.location?.addressDetail || '',
      // The sender's own map: scores only once the manager signed them off.
      status: senderStatus(r),
      score: scoresReleased(r) ? r.finalScore : null,
      province: r.location?.province,
      district: r.location?.district,
    });
  }

  return resolveReportPointLocations(points);
}
