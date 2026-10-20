import dataStore from '@/lib/db';
import type { Payload } from '@/lib/db/types';
import type { CompanyPoint } from '@/components/map/CompanyMap';
import { SURVEY_LAYER_ID, querySurvey } from '@/lib/db/survey';
import { fetchSurveyMapPoints } from '@/lib/map/surveyMapPoints';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { resolveReportPointLocations } from '@/lib/map/locationResolver';

type SurveyRecord = { coords?: [number, number] };
type ReportForPoint = Payload<'report', { include: { senderCompany: true; reportType: true; location: true } }> & {
  pointScore?: number | null;
};

type FetchReviewedCompanyPointsOptions = {
  evaluatorUserId?: string;
};

async function fetchSurveyCoordsByRegister(): Promise<Record<string, SurveyRecord>> {
  try {
    // Survey layer 0 is the coordinate fallback when a report's own picked
    // location is missing.
    const features = await querySurvey(SURVEY_LAYER_ID, { returnGeometry: true });
    const map: Record<string, SurveyRecord> = {};
    features.forEach((f) => {
      const reg = (f.attributes.Register ?? '').toString().trim();
      if (!reg) return;
      map[reg.toUpperCase()] = { coords: f.geometry ? [f.geometry.x, f.geometry.y] : undefined };
    });
    return map;
  } catch {
    return {};
  }
}

async function fetchReportsForPoints(evaluatorUserId?: string): Promise<ReportForPoint[]> {
  if (evaluatorUserId) {
    const assignments = await dataStore.reportAssignment.findMany({
      where: {
        evaluatorUserId,
        report: { title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
      },
      include: {
        evaluation: true,
        report: {
          include: { senderCompany: true, reportType: true, location: true },
        },
      },
      orderBy: { submittedAt: 'desc' },
    });
    return assignments.map((assignment) => ({
      ...assignment.report,
      pointScore: assignment.evaluation?.totalScore ?? null,
    }));
  }
  return dataStore.report.findMany({
    where: { status: { not: 'draft' }, title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE } },
    include: { senderCompany: true, reportType: true, location: true },
    orderBy: { submittedAt: 'desc' },
  });
}

/**
 * One pin per report visible to the review organisation. Managers see every
 * received report, while evaluator staff see reports assigned to them so the
 * project's pinned location is visible before and after scoring.
 */
export async function fetchReviewedCompanyPoints(
  options: FetchReviewedCompanyPointsOptions = {},
): Promise<CompanyPoint[]> {
  const [reportRows, surveyCoords] = await Promise.all([
    fetchReportsForPoints(options.evaluatorUserId),
    fetchSurveyCoordsByRegister(),
  ]);

  const reports = await attachEffectiveSenderCompanies(reportRows);

  const points: CompanyPoint[] = [];
  const registers = new Set<string>();
  const locationsByRegister: Record<string, { province?: string | null; district?: string | null }> = {};

  for (const r of reports) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    if (register) registers.add(register);
    if (register && r.location) {
      locationsByRegister[register.toUpperCase()] = {
        province: r.location.province,
        district: r.location.district,
      };
    }
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
      source: 'report',
      lat,
      lng,
      company: r.implementerName || r.senderCompany?.name || register || 'Байгууллага',
      register,
      reportNumber: r.reportNumber,
      reportType: r.reportType?.name || '',
      location: r.location?.addressDetail || '',
      status: r.status,
      score: r.pointScore ?? r.finalScore,
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

  const surveyPoints = await fetchSurveyMapPoints(
    options.evaluatorUserId
      ? { registers: Array.from(registers), locationsByRegister }
      : { locationsByRegister },
  );

  return [...resolvedPoints, ...surveyPoints];
}
