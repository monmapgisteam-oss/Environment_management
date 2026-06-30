import prisma from '@/lib/prisma';

// ---------------------------------------------------------------------------
// ArcGIS / Survey123 write-back integration.
//
// When an evaluator submits their scores, we mirror the result into the hosted
// Survey123 feature service:
//   * Layer 0 ("survey")   – one feature per report (organisation + report info)
//   * Table 1 ("repeat_1") – one row per evaluator (Member_name + Q1..Q8)
//
// Authentication uses an ArcGIS API key (ARCGIS_API_KEY). If the key is absent
// every function here no-ops, so scoring keeps working before the key is set.
// ---------------------------------------------------------------------------

const SERVICE_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer';
const SURVEY_LAYER_ID = 0; // report features
const REPEAT_TABLE_ID = 1; // per-evaluator score rows

function apiKey(): string {
  return process.env.ARCGIS_API_KEY?.trim() || '';
}

function hasApiKey(): boolean {
  return apiKey().length > 0;
}

// The Survey123 service accepts anonymous adds, so the write-back is always on.
// An API key is optional — it additionally enables in-place updates (re-scoring)
// and deletes, which anonymous editing cannot do under ownership access control.
// Set ARCGIS_SYNC_DISABLED=true to turn the integration off entirely.
export function arcgisEnabled(): boolean {
  return process.env.ARCGIS_SYNC_DISABLED?.trim().toLowerCase() !== 'true';
}

type EditResult = { objectId?: number; globalId?: string; success?: boolean; error?: any };

// POST helper for the ArcGIS REST add/update endpoints. Returns the first edit
// result, or null on any transport/service error.
async function postFeatures(
  layerId: number,
  op: 'addFeatures' | 'updateFeatures',
  features: any[],
  useGlobalIds = false,
): Promise<EditResult | null> {
  const body = new URLSearchParams();
  body.set('f', 'json');
  // Token only when an API key is configured; otherwise edit anonymously.
  if (hasApiKey()) body.set('token', apiKey());
  body.set('rollbackOnFailure', 'true');
  if (useGlobalIds) body.set('useGlobalIds', 'true');
  body.set('features', JSON.stringify(features));

  const res = await fetch(`${SERVICE_URL}/${layerId}/${op}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    // ArcGIS edits should never be cached.
    cache: 'no-store',
  });
  const json: any = await res.json();
  if (json?.error) {
    console.error('[arcgis]', op, 'service error:', json.error?.message || json.error);
    return null;
  }
  const result: EditResult | undefined = (json.addResults || json.updateResults || [])[0];
  if (!result || result.success === false) {
    console.error('[arcgis]', op, 'edit failed:', result?.error || 'unknown');
    return null;
  }
  return result;
}

function epoch(d: Date | null | undefined): number | null {
  return d ? new Date(d).getTime() : null;
}

// Ensure the report exists as a feature in Layer 0; returns its GlobalID.
async function ensureReportFeature(report: any): Promise<string | null> {
  if (report.arcgisGlobalId) return report.arcgisGlobalId;

  const attributes: Record<string, any> = {
    Report_type: report.reportType?.name ?? null,
    project_name: report.title ?? null,
    Organization: report.senderCompany?.name ?? null,
    Register: report.senderCompany?.registerNumber ?? null,
    Project_date: epoch(report.approvedDate ?? report.submittedAt),
    Description: report.description ?? null,
  };

  const feature: any = { attributes };
  if (report.location?.latitude != null && report.location?.longitude != null) {
    feature.geometry = {
      x: report.location.longitude,
      y: report.location.latitude,
      spatialReference: { wkid: 4326 },
    };
  }

  const result = await postFeatures(SURVEY_LAYER_ID, 'addFeatures', [feature]);
  const globalId = result?.globalId;
  if (!globalId) return null;

  await prisma.report.update({
    where: { id: report.id },
    data: { arcgisGlobalId: globalId },
  });
  return globalId;
}

// Add or update this evaluator's score row in the repeat_1 table.
async function upsertMemberRow(
  parentGlobalId: string,
  evaluation: any,
  evaluatorName: string,
  qScores: Record<string, number>,
): Promise<void> {
  const attributes: Record<string, any> = {
    Member_name: evaluatorName,
    parentglobalid: parentGlobalId,
    ...qScores,
  };

  if (evaluation.arcgisGlobalId) {
    // Re-scoring: update the existing row in place (matched by GlobalID).
    // Updates require an API key — anonymous editing can't modify existing rows
    // (ownership access control), so without a key we leave the original row.
    if (!hasApiKey()) {
      console.warn('[arcgis] re-score not synced (set ARCGIS_API_KEY to enable updates):', evaluation.id);
      return;
    }
    attributes.globalid = evaluation.arcgisGlobalId;
    await postFeatures(REPEAT_TABLE_ID, 'updateFeatures', [{ attributes }], true);
    return;
  }

  const result = await postFeatures(REPEAT_TABLE_ID, 'addFeatures', [{ attributes }]);
  if (result?.globalId) {
    await prisma.evaluation.update({
      where: { id: evaluation.id },
      data: { arcgisGlobalId: result.globalId },
    });
  }
}

/**
 * Mirror one evaluator's submitted scores into the Survey123 service.
 * Never throws — any failure is logged and the local evaluation is unaffected.
 */
export async function syncEvaluationToSurvey(params: {
  reportId: string;
  evaluationId: string;
  evaluatorName: string;
}): Promise<void> {
  if (!arcgisEnabled()) return;

  try {
    const [report, evaluation, criteria] = await Promise.all([
      prisma.report.findUnique({
        where: { id: params.reportId },
        include: { reportType: true, senderCompany: true, location: true },
      }),
      prisma.evaluation.findUnique({
        where: { id: params.evaluationId },
        include: { scores: true },
      }),
      prisma.evaluationCriterion.findMany({
        where: { isActive: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);

    if (!report || !evaluation) return;

    // Map each criterion (in sort order) to Q1..Q8.
    const qByCriterion: Record<string, string> = {};
    criteria.forEach((c: any, i: number) => {
      qByCriterion[c.id] = `Q${i + 1}`;
    });
    const qScores: Record<string, number> = {};
    evaluation.scores.forEach((s: any) => {
      const q = qByCriterion[s.criterionId];
      if (q) qScores[q] = s.score;
    });

    const parentGlobalId = await ensureReportFeature(report);
    if (!parentGlobalId) return; // could not create/find the parent feature

    await upsertMemberRow(parentGlobalId, evaluation, params.evaluatorName, qScores);
  } catch (err) {
    console.error('[arcgis] syncEvaluationToSurvey failed:', err);
  }
}
