import prisma from '@/lib/prisma';
import type { CompanyPoint } from '@/components/CompanyMap';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';

// Survey123 Layer 0 query endpoint. Used as a coordinate fallback when a
// report's own picked location is missing.
const SURVEY_QUERY_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query';

type SurveyRecord = { coords?: [number, number] };
type ReportForPoint = any & { pointScore?: number | null };

type FetchReviewedCompanyPointsOptions = {
  evaluatorUserId?: string;
};

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
 * One pin per report visible to the review organisation. Managers see every
 * received report, while evaluator staff see only reports they have reviewed.
 */
export async function fetchReviewedCompanyPoints(
  options: FetchReviewedCompanyPointsOptions = {},
): Promise<CompanyPoint[]> {
  const [reportRows, surveyCoords] = await Promise.all([
    options.evaluatorUserId
      ? prisma.reportAssignment.findMany({
          where: {
            evaluatorUserId: options.evaluatorUserId,
            evaluation: { isNot: null },
          },
          include: {
            evaluation: true,
            report: {
              include: { senderCompany: true, reportType: true, location: true },
            },
          },
          orderBy: { submittedAt: 'desc' },
        })
      : prisma.report.findMany({
          where: { status: { not: 'draft' } },
          include: { senderCompany: true, reportType: true, location: true },
          orderBy: { submittedAt: 'desc' },
        }),
    fetchSurveyCoordsByRegister(),
  ]);

  const reports: ReportForPoint[] = options.evaluatorUserId
    ? (reportRows as any[]).map((assignment) => ({
        ...assignment.report,
        pointScore: assignment.evaluation?.totalScore ?? null,
      }))
    : (reportRows as any[]);

  const points: CompanyPoint[] = [];

  for (const r of reports) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    const s = register ? surveyCoords[register.toUpperCase()] : undefined;

    let lat: number | undefined;
    let lng: number | undefined;
    if (r.location?.latitude != null && r.location?.longitude != null) {
      lat = r.location.latitude;
      lng = r.location.longitude;
    } else if (s?.coords && s.coords.length >= 2) {
      lng = s.coords[0];
      lat = s.coords[1];
    }
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
      status: r.status,
      score: r.pointScore ?? r.finalScore,
    });
  }

  return points;
}
