import prisma from '@/lib/prisma';
import type { CompanyPoint } from '@/components/CompanyMap';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';
import { fetchSurveyMapPoints } from '@/lib/surveyMapPoints';
import { attachEffectiveSenderCompanies } from '@/lib/reportCompanies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/conclusions';

// Same Survey123 fallback lookup as fetchReviewedCompanyPoints, kept
// separate since this one scopes to a single sender company instead of
// every company the review organisation has touched.
const SURVEY_QUERY_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query';

async function fetchSurveyCoordsByRegister(): Promise<Record<string, [number, number]>> {
  try {
    const where = encodeURIComponent(`OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`);
    const res = await fetch(
      `${SURVEY_QUERY_URL}?where=${where}&outFields=Register&returnGeometry=true&f=geojson`,
      { cache: 'no-store' },
    );
    const json: any = await res.json();
    const map: Record<string, [number, number]> = {};
    (json.features || []).forEach((f: any) => {
      const reg = (f.properties?.Register ?? '').toString().trim();
      if (!reg || !f.geometry?.coordinates) return;
      map[reg.toUpperCase()] = f.geometry.coordinates;
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
    prisma.company.findUnique({ where: { id: companyId } }),
    prisma.report.findMany({
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

  for (const r of reports as any[]) {
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
      status: r.status,
      score: r.finalScore,
      province: r.location?.province,
      district: r.location?.district,
    });
  }

  const surveyPoints = await fetchSurveyMapPoints({ registers: Array.from(registers), locationsByRegister });

  return [...points, ...surveyPoints];
}
