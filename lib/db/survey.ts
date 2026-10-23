import { api } from '@/convex/_generated/api';
import { convex, serverSecret } from './convex';

// Survey123 records copied from ArcGIS into Convex:
//   * Layer 0 – one point feature per report
//   * Layer 1 – one row per evaluator (Member_name + Q1..Q8), linked to
//               layer 0 by parentglobalid (formerly the repeat_1 table)
export const SURVEY_LAYER_ID = 0;
export const SURVEY_REPEAT_LAYER_ID = 1;

export type SurveyFeature = {
  attributes: Record<string, any>;
  geometry?: { x: number; y: number };
};

export type SurveyFilter = {
  register?: string;
  /** exact = case-sensitive, iexact = case-insensitive, contains = case-insensitive substring. */
  registerMatch?: 'exact' | 'iexact' | 'contains';
  objectIds?: number[];
  parentGlobalIds?: string[];
};

export async function querySurvey(
  layerId: number,
  options: { filter?: SurveyFilter; returnGeometry?: boolean; resultRecordCount?: number } = {},
): Promise<SurveyFeature[]> {
  const rows = await convex().query(api.survey.list, {
    secret: serverSecret(), layerId, filter: options.filter, limit: options.resultRecordCount,
  });
  return rows.map((row) => ({
    attributes: row.attributes,
    ...(options.returnGeometry && row.x != null && row.y != null ? { geometry: { x: row.x, y: row.y } } : {}),
  }));
}

export type SurveyAttachmentGroup = {
  parentObjectId: number;
  attachmentInfos?: { id: number; name?: string; contentType?: string }[];
};

export async function querySurveyAttachments(layerId: number, objectIds: number[]): Promise<SurveyAttachmentGroup[]> {
  if (objectIds.length === 0) return [];
  return convex().query(api.survey.attachments, { secret: serverSecret(), layerId, objectIds });
}

// Photos are served through the app so storage URLs never reach the browser
// (see app/api/survey/attachments).
export function surveyAttachmentUrl(layerId: number, objectId: number, attachmentId: number): string {
  return `/api/survey/attachments/${layerId}/${objectId}/${attachmentId}`;
}

export async function fetchSurveyAttachment(layerId: number, objectId: number, attachmentId: number): Promise<Response | null> {
  const found = await convex().query(api.survey.attachmentUrl, { secret: serverSecret(), layerId, objectId, attachmentId });
  if (!found?.url) return null;
  const response = await fetch(found.url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  return response.ok ? response : null;
}

export type SurveyEditResult = { objectId: number; globalId: string };

export async function addSurveyRecord(
  layerId: number,
  attributes: Record<string, any>,
  geometry?: { x: number; y: number } | null,
): Promise<SurveyEditResult> {
  return convex().mutation(api.survey.add, { secret: serverSecret(), layerId, attributes, geometry: geometry ?? null });
}

export async function updateSurveyRecord(
  layerId: number,
  globalId: string,
  attributes: Record<string, any>,
): Promise<SurveyEditResult | null> {
  return convex().mutation(api.survey.updateByGlobalId, { secret: serverSecret(), layerId, globalid: globalId, attributes });
}

export async function removeSurveyRecord(layerId: number, globalId: string): Promise<boolean> {
  return convex().mutation(api.survey.removeByGlobalId, { secret: serverSecret(), layerId, globalid: globalId });
}
