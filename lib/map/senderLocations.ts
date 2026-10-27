import dataStore from '@/lib/db';
import type { CompanyPoint } from '@/components/map/CompanyMap';
import { SURVEY_LAYER_ID, querySurvey } from '@/lib/db/survey';
import { fetchSurveyMapPoints } from '@/lib/map/surveyMapPoints';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { resolveReportPointLocations } from '@/lib/map/locationResolver';
import { scoresReleased, senderStatus } from '@/lib/reports/scoreRelease';

// Same Survey123 fallback lookup as fetchReviewedCompanyPoints, kept
// separate since this one scopes to a single sender company instead of
// every company the review organisation has touched.
async function fetchSurveyCoordsByRegister(): Promise<Record<string, [number, number]>> {
  try {
    const features = await querySurvey(SURVEY_LAYER_ID, { returnGeometry: true });
    const map: Record<string, [number, number]> = {};
    features.forEach((f) => {
      const reg = (f.attributes.Register ?? '').toString().trim();
      if (!reg || !f.geometry) return;
      map[reg.toUpperCase()] = [f.geometry.x, f.geometry.y];
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * One pin per submitted report belonging to the given sender company — a
 * sender should only ever see their own organisation's locations, never
 * every company the way the reviewer's "Газарзүйн мэдээлэл" map does.
 */
export async function fetchSenderCompanyPoints(companyId: string): Promise<CompanyPoint[]> {
  const [company, rawReports, surveyCoords] = await Promise.all([
    dataStore.company.findUnique({ where: { id: companyId } }),
    dataStore.report.findMany({
      where: {
        status: { not: 'draft' },
        title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
        OR: [{ senderCompanyId: companyId }, { implementerRegister: { not: null } }],
      },
      include: { senderCompany: true, reportType: true, location: true },
      orderBy: { submittedAt: 'desc' },
    }),
    fetchSurveyCoordsByRegister(),
  ]);
  const reports = (await attachEffectiveSenderCompanies(rawReports)).filter(
    (report) => report.senderCompany?.id === companyId,
  );

  const points: CompanyPoint[] = [];
  const registers = new Set<string>();
  const locationsByRegister: Record<string, { province?: string | null; district?: string | null }> = {};
  if (company?.registerNumber) registers.add(company.registerNumber);

  for (const r of reports) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    if (register) registers.add(register);
    if (register && r.location) {
      locationsByRegister[register.toUpperCase()] = {
        province: r.location.province,
        district: r.location.district,
      };
    }

    let lat: number | undefined;
    let lng: number | undefined;
    if (r.location?.latitude != null && r.location?.longitude != null) {
      lat = r.location.latitude;
      lng = r.location.longitude;
    } else {
      const coords = register ? surveyCoords[register.toUpperCase()] : undefined;
      if (coords) {
        lng = coords[0];
        lat = coords[1];
      }
    }
    if (lat == null || lng == null) continue;

    points.push({
      id: r.id,
      source: 'report',
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

  const resolvedPoints = await resolveReportPointLocations(points);
  resolvedPoints.forEach((point) => {
    if (!point.register) return;
    locationsByRegister[point.register.toUpperCase()] = {
      province: point.province,
      district: point.district,
    };
  });

  const surveyPoints = await fetchSurveyMapPoints({ registers: Array.from(registers), locationsByRegister });

  return [...resolvedPoints, ...surveyPoints];
}
