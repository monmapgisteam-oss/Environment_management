import dataStore from '@/lib/db';
import type { Evaluation } from '@/lib/db/models';
import type { Payload } from '@/lib/db/types';
import { SURVEY_LAYER_ID, SURVEY_REPEAT_LAYER_ID, addSurveyRecord, querySurvey, updateSurveyRecord } from '@/lib/db/survey';
import { fetchSurveyPhotoMap, type SurveyPhoto } from '@/lib/survey/photos';
import { normalizeSurveyReportType } from '@/lib/survey/reportType';

// ---------------------------------------------------------------------------
// Survey write-back integration.
//
// When an evaluator submits their scores, we mirror the result into the
// survey records stored in Convex:
//   * Layer 0                         – one feature per report (organisation + report info)
//   * Layer 1 (formerly repeat_1)     – one row per evaluator (Member_name + Q1..Q8)
//
// Set SURVEY_SYNC_DISABLED=true to turn the integration off entirely.
// ---------------------------------------------------------------------------

export function surveySyncEnabled(): boolean {
  return process.env.SURVEY_SYNC_DISABLED?.trim().toLowerCase() !== 'true';
}

function epoch(d: Date | null | undefined): number | null {
  return d ? new Date(d).getTime() : null;
}

export type SurveyInfo = {
  objectId: number | null;
  projectName: string | null;
  organization: string | null;
  reportType: string | null;
  register: string | null;
  projectDate: number | null;
  description: string | null;
  photos: SurveyPhoto[];
};

// The company may have filled in the Survey123 field app directly (independent
// of our own web app); when their register number matches, surface that
// submission's details on the report page automatically.
export async function fetchSurveyInfoByRegister(register: string): Promise<SurveyInfo | null> {
  const reg = (register || '').trim();
  if (!reg) return null;
  try {
    const [feature] = await querySurvey(SURVEY_LAYER_ID, { filter: { register: reg, registerMatch: 'iexact' } });
    const attrs = feature?.attributes;
    if (!attrs) return null;
    const objectId = attrs.objectid ?? attrs.OBJECTID;
    const photos =
      typeof objectId === 'number'
        ? (await fetchSurveyPhotoMap([objectId])).get(objectId) || []
        : [];
    return {
      objectId: typeof objectId === 'number' ? objectId : null,
      projectName: attrs.project_name ?? null,
      organization: attrs.Organization ?? null,
      reportType: normalizeSurveyReportType(attrs.Report_type) || null,
      register: attrs.Register ?? null,
      projectDate: attrs.Project_date ?? null,
      description: attrs.Description ?? null,
      photos,
    };
  } catch {
    return null;
  }
}

// Find an existing Layer 0 survey feature by register number (the company may
// have already filled the Survey123 form). Returns its GlobalID, or null.
async function findReportFeatureByRegister(register: string): Promise<string | null> {
  if (!register) return null;
  try {
    const [feature] = await querySurvey(SURVEY_LAYER_ID, {
      filter: { register, registerMatch: 'exact' },
    });
    const attrs = feature?.attributes;
    return attrs?.globalid ?? attrs?.GlobalID ?? null;
  } catch {
    return null;
  }
}

type SyncedReport = Payload<'report', { include: { reportType: true; senderCompany: true; location: true } }>;

// Ensure the report exists as a feature in Layer 0; returns its GlobalID.
// The register the user typed (implementerRegister) is the key, so reports tie
// to the company's own survey record rather than the fixed sender account.
async function ensureReportFeature(report: SyncedReport): Promise<string | null> {
  if (report.arcgisGlobalId) return report.arcgisGlobalId;

  const register = (report.implementerRegister || report.senderCompany?.registerNumber || '').trim();

  // 1) Reuse the company's existing survey row when the register matches.
  let globalId = await findReportFeatureByRegister(register);

  // 2) Otherwise create a new feature from the report's own details.
  if (!globalId) {
    const attributes: Record<string, unknown> = {
      Report_type: normalizeSurveyReportType(report.reportType?.name) || null,
      project_name: report.title ?? null,
      Organization: report.implementerName ?? report.senderCompany?.name ?? null,
      Register: register || null,
      Project_date: epoch(report.approvedDate ?? report.submittedAt),
      Description: report.description ?? null,
    };

    const geometry = report.location?.latitude != null && report.location?.longitude != null
      ? { x: report.location.longitude, y: report.location.latitude }
      : null;

    const result = await addSurveyRecord(SURVEY_LAYER_ID, attributes, geometry);
    globalId = result.globalId;
  }

  if (!globalId) return null;

  await dataStore.report.update({
    where: { id: report.id },
    data: { arcgisGlobalId: globalId },
  });
  return globalId;
}

// Add or update this evaluator's score row in the repeat_1 table.
async function upsertMemberRow(
  parentGlobalId: string,
  evaluation: Pick<Evaluation, 'id' | 'arcgisGlobalId'>,
  evaluatorName: string,
  qScores: Record<string, number>,
): Promise<void> {
  const attributes: Record<string, unknown> = {
    Member_name: evaluatorName,
    parentglobalid: parentGlobalId,
    ...qScores,
  };

  if (evaluation.arcgisGlobalId) {
    // Re-scoring: update the existing row in place (matched by GlobalID).
    await updateSurveyRecord(SURVEY_REPEAT_LAYER_ID, evaluation.arcgisGlobalId, attributes);
    return;
  }

  const result = await addSurveyRecord(SURVEY_REPEAT_LAYER_ID, attributes);
  if (result.globalId) {
    await dataStore.evaluation.update({
      where: { id: evaluation.id },
      data: { arcgisGlobalId: result.globalId },
    });
  }
}

/**
 * Mirror one evaluator's submitted scores into the survey records.
 * Never throws — any failure is logged and the local evaluation is unaffected.
 */
export async function syncEvaluationToSurvey(params: {
  reportId: string;
  evaluationId: string;
  evaluatorName: string;
}): Promise<void> {
  if (!surveySyncEnabled()) return;

  try {
    const [report, evaluation, criteria] = await Promise.all([
      dataStore.report.findUnique({
        where: { id: params.reportId },
        include: { reportType: true, senderCompany: true, location: true },
      }),
      dataStore.evaluation.findUnique({
        where: { id: params.evaluationId },
        include: { scores: true },
      }),
      dataStore.evaluationCriterion.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!report || !evaluation) return;

    // Map each criterion (in sort order) to Q1..Q8.
    const qByCriterion: Record<string, string> = {};
    criteria.forEach((c, i) => {
      qByCriterion[c.id] = `Q${i + 1}`;
    });
    const qScores: Record<string, number> = {};
    evaluation.scores.forEach((s) => {
      const q = qByCriterion[s.criterionId];
      if (q) qScores[q] = s.score;
    });

    const parentGlobalId = await ensureReportFeature(report);
    if (!parentGlobalId) return; // could not create/find the parent feature

    await upsertMemberRow(parentGlobalId, evaluation, params.evaluatorName, qScores);
  } catch (err) {
    console.error('[survey] syncEvaluationToSurvey failed:', err);
  }
}
