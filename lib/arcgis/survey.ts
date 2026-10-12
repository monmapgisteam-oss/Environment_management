import { arcgisFetch, arcgisRequest } from './service';

// Survey123-style records live in the same private Feature Service as the
// application tables:
//   * Layer 0 ("Tailan")             – one point feature per report
//   * Table "repeat_1"               – one row per evaluator (Member_name + Q1..Q8),
//                                      linked to layer 0 by parentglobalid
// Every request runs server-side with the application credential.
export const SURVEY_LAYER_ID = 0;
// Survey123 matches a form repeat to the table with the same name.
export const SURVEY_REPEAT_TABLE = 'repeat_1';

let repeatTableId: Promise<number> | undefined;
export function surveyRepeatTableId(): Promise<number> {
  repeatTableId ??= arcgisRequest<{ tables?: { id: number; name: string }[] }>('').then((root) => {
    const table = (root.tables || []).find((entry) => entry.name === SURVEY_REPEAT_TABLE);
    if (!table) throw new Error(`ArcGIS table ${SURVEY_REPEAT_TABLE} is missing. Run npm run arcgis:survey-schema.`);
    return table.id;
  });
  repeatTableId.catch(() => { repeatTableId = undefined; });
  return repeatTableId;
}

export type SurveyFeature = {
  attributes: Record<string, any>;
  geometry?: { x: number; y: number };
};

// Enterprise data stores may lowercase field names and use their own editor
// tracking fields, so map everything back to the Survey123 names callers use.
const CANONICAL = [
  'objectid', 'globalid', 'Report_type', 'project_name', 'Organization', 'Register', 'Project_date',
  'Description', 'aimag', 'sum', 'bag', 'CreationDate', 'Creator', 'EditDate', 'Editor',
  'Member_name', 'Q1', 'Q2', 'Q3', 'Q4', 'Q5', 'Q6', 'Q7', 'Q8', 'parentglobalid',
];
const ALIASES: Record<string, string> = {
  ...Object.fromEntries(CANONICAL.map((name) => [name.toLowerCase(), name])),
  created_date: 'CreationDate',
  created_user: 'Creator',
  last_edited_date: 'EditDate',
  last_edited_user: 'Editor',
};

export function canonicalAttributes(attributes: Record<string, any> = {}): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(attributes)) {
    const name = ALIASES[key.toLowerCase()] ?? key;
    if (!(name in result) || result[name] == null) result[name] = value;
  }
  return result;
}

// Map canonical attribute names to the names stored on the target layer.
async function storedAttributes(layerId: number, attributes: Record<string, any>) {
  const info = await arcgisRequest<{ fields?: { name: string }[] }>(String(layerId));
  const stored = new Map((info.fields || []).map((field) => [field.name.toLowerCase(), field.name]));
  return Object.fromEntries(Object.entries(attributes).map(([key, value]) => [stored.get(key.toLowerCase()) ?? key, value]));
}

export async function querySurvey(
  layerId: number,
  options: { where?: string; outFields?: string; returnGeometry?: boolean; resultRecordCount?: number } = {},
): Promise<SurveyFeature[]> {
  const result = await arcgisRequest<{ features?: { attributes?: Record<string, any>; geometry?: { x?: number; y?: number } }[] }>(
    `${layerId}/query`,
    {
      where: options.where || '1=1',
      outFields: options.outFields || '*',
      returnGeometry: options.returnGeometry ?? false,
      // Callers work in latitude/longitude regardless of the service projection.
      outSR: 4326,
      resultRecordCount: options.resultRecordCount,
    },
  );
  return (result.features || []).map((feature) => {
    const x = feature.geometry?.x;
    const y = feature.geometry?.y;
    return {
      attributes: canonicalAttributes(feature.attributes),
      ...(typeof x === 'number' && typeof y === 'number' ? { geometry: { x, y } } : {}),
    };
  });
}

export type SurveyAttachmentGroup = {
  parentObjectId: number;
  attachmentInfos?: { id: number; name?: string; contentType?: string }[];
};

export async function querySurveyAttachments(layerId: number, objectIds: number[]): Promise<SurveyAttachmentGroup[]> {
  if (objectIds.length === 0) return [];
  const result = await arcgisRequest<{ attachmentGroups?: SurveyAttachmentGroup[] }>(`${layerId}/queryAttachments`, {
    objectIds: objectIds.join(','),
  });
  return result.attachmentGroups || [];
}

// Photos are served through the app so the service credential never reaches
// the browser (see app/api/survey/attachments).
export function surveyAttachmentUrl(layerId: number, objectId: number, attachmentId: number): string {
  return `/api/survey/attachments/${layerId}/${objectId}/${attachmentId}`;
}

export async function fetchSurveyAttachment(layerId: number, objectId: number, attachmentId: number): Promise<Response> {
  return arcgisFetch(`${layerId}/${objectId}/attachments/${attachmentId}`);
}

type EditResult = { objectId?: number; globalId?: string; success?: boolean; error?: unknown };

export async function editSurvey(
  layerId: number,
  op: 'addFeatures' | 'updateFeatures',
  features: SurveyFeature[] | { attributes: Record<string, any>; geometry?: unknown }[],
  useGlobalIds = false,
): Promise<EditResult | null> {
  const stored = await Promise.all(features.map(async (feature) => ({
    ...feature,
    attributes: await storedAttributes(layerId, feature.attributes),
  })));
  const result = await arcgisRequest<{ addResults?: EditResult[]; updateResults?: EditResult[] }>(`${layerId}/${op}`, {
    features: stored,
    rollbackOnFailure: true,
    ...(useGlobalIds ? { useGlobalIds: true } : {}),
  });
  const edit = (result.addResults || result.updateResults || [])[0];
  if (!edit || edit.success === false) {
    console.error('[arcgis]', op, 'edit failed:', edit?.error || 'unknown');
    return null;
  }
  return edit;
}
