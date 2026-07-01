import prisma from '@/lib/prisma';
import type { CompanyPoint } from '@/components/CompanyMap';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';

// Survey123 Layer 0 query endpoint — used only as a coordinate fallback when a
// report's own picked location is missing; the survey point is often more
// precisely field-verified than a manually dropped pin.
const SURVEY_QUERY_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query';

type SurveyRecord = { coords?: [number, number] };

// Build a register -> coordinates map from the live survey service.
async function fetchSurveyCoordsByRegister(): Promise<Record<string, SurveyRecord>> {
  try {
    const where = encodeURIComponent(`OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`);
    const res = await fetch(
      `${SURVEY_QUERY_URL}?where=${where}&outFields=Register&returnGeometry=true&f=geojson`,
      { cache: 'no-store' },
    );
    const json: any = await res.json();
    const map: Record<string, SurveyRecord> = {};
    (json.features || []).forEach((f: any) => {
      const reg = (f.properties?.Register ?? '').toString().trim();
      if (!reg) return;
      map[reg.toUpperCase()] = { coords: f.geometry?.coordinates };
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Every company the review organisation has reviewed (reports that were
 * assigned to staff), de-duplicated by register, in the same shape the
 * admin dashboard map uses — so the manager and staff "Газарзүйн мэдээлэл"
 * pages render the identical search/filter/cluster/score-color map.
 */
export async function fetchReviewedCompanyPoints(): Promise<CompanyPoint[]> {
  const [reports, surveyCoords] = await Promise.all([
    prisma.report.findMany({
      where: { assignments: { some: {} } },
      include: { senderCompany: true, reportType: true, location: true },
      orderBy: { submittedAt: 'desc' },
    }),
    fetchSurveyCoordsByRegister(),
  ]);

  const seen = new Set<string>();
  const points: CompanyPoint[] = [];

  for (const r of reports as any[]) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    const key = register ? register.toUpperCase() : `report:${r.id}`;
    if (seen.has(key)) continue;

    const s = register ? surveyCoords[register.toUpperCase()] : undefined;

    let lat: number | undefined;
    let lng: number | undefined;
    if (s?.coords && s.coords.length >= 2) {
      lng = s.coords[0];
      lat = s.coords[1];
    } else if (r.location?.latitude != null && r.location?.longitude != null) {
      lat = r.location.latitude;
      lng = r.location.longitude;
    }
    if (lat == null || lng == null) continue;

    seen.add(key);

    points.push({
      id: r.id,
      lat,
      lng,
      company: r.implementerName || r.senderCompany?.name || register || 'Байгууллага',
      register,
      reportNumber: r.reportNumber,
      reportType: r.reportType?.name || '',
      location: r.location?.addressDetail || '',
      status: r.status,
      score: r.finalScore,
    });
  }

  return points;
}
