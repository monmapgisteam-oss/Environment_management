import dataStore from '@/lib/db';
import type { Payload } from '@/lib/db/types';
import type { CompanyPoint } from '@/components/map/CompanyMap';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@/lib/reports/conclusions';
import { resolveReportPointLocations } from '@/lib/map/locationResolver';

type ReportForPoint = Payload<'report', { include: { senderCompany: true; reportType: true; location: true } }> & {
  pointScore?: number | null;
};

type FetchReviewedCompanyPointsOptions = {
  evaluatorUserId?: string;
};

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
  const reports = await attachEffectiveSenderCompanies(await fetchReportsForPoints(options.evaluatorUserId));

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
      status: r.status,
      score: r.pointScore ?? r.finalScore,
      province: r.location?.province,
      district: r.location?.district,
    });
  }

  return resolveReportPointLocations(points);
}
