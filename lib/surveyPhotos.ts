import {
  SURVEY_LAYER_ID,
  querySurvey,
  querySurveyAttachments,
  surveyAttachmentUrl,
  surveyRepeatTableId,
} from '@/lib/arcgis/survey';

export type SurveyPhoto = {
  src: string;
  alt?: string;
};

type SurveyAttachment = {
  id: number;
  name?: string;
  contentType?: string;
};

type AttachmentGroup = {
  parentObjectId: number;
  attachmentInfos?: SurveyAttachment[];
};

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

function addPhotos(map: Map<number, SurveyPhoto[]>, parentObjectId: number, photos: SurveyPhoto[]) {
  if (photos.length === 0) return;
  map.set(parentObjectId, [...(map.get(parentObjectId) || []), ...photos]);
}

async function fetchLayerAttachments(
  layerId: number,
  objectIds: number[],
  parentForAttachmentObjectId: (objectId: number) => number | undefined,
): Promise<Map<number, SurveyPhoto[]>> {
  const map = new Map<number, SurveyPhoto[]>();
  if (objectIds.length === 0) return map;

  await Promise.all(
    chunk(objectIds, 100).map(async (ids) => {
      try {
        (await querySurveyAttachments(layerId, ids)).forEach((group) => {
          const parentObjectId = parentForAttachmentObjectId(group.parentObjectId);
          if (parentObjectId === undefined) return;
          const photos = (group.attachmentInfos || [])
            .filter((attachment) => attachment.contentType?.startsWith('image/'))
            .map((attachment) => ({
              src: surveyAttachmentUrl(layerId, group.parentObjectId, attachment.id),
              alt: attachment.name || 'Survey123 photo',
            }));
          addPhotos(map, parentObjectId, photos);
        });
      } catch {
        // Keep the survey visible even if an attachment lookup fails.
      }
    }),
  );

  return map;
}

// Map each repeat row to its survey feature through parentglobalid.
async function fetchRepeatParents(surveyObjectIds: number[]): Promise<Map<number, number>> {
  const repeatParentByObjectId = new Map<number, number>();
  if (surveyObjectIds.length === 0) return repeatParentByObjectId;

  await Promise.all(
    chunk(surveyObjectIds, 100).map(async (ids) => {
      try {
        const parents = await querySurvey(SURVEY_LAYER_ID, {
          where: `objectid IN (${ids.join(',')})`,
          outFields: 'objectid,globalid',
        });
        const surveyByGlobalId = new Map(
          parents
            .filter((feature) => typeof feature.attributes.objectid === 'number' && feature.attributes.globalid)
            .map((feature) => [String(feature.attributes.globalid).toLowerCase(), feature.attributes.objectid as number]),
        );
        if (surveyByGlobalId.size === 0) return;
        const globalIds = Array.from(surveyByGlobalId.keys()).map((id) => `'${id.replace(/[^0-9a-f{}-]/gi, '')}'`);
        const rows = await querySurvey(await surveyRepeatTableId(), {
          where: `parentglobalid IN (${globalIds.join(',')})`,
          outFields: 'objectid,parentglobalid',
        });
        rows.forEach((row) => {
          const surveyObjectId = surveyByGlobalId.get(String(row.attributes.parentglobalid || '').toLowerCase());
          if (typeof row.attributes.objectid === 'number' && surveyObjectId !== undefined) {
            repeatParentByObjectId.set(row.attributes.objectid, surveyObjectId);
          }
        });
      } catch {
        // Repeat records are optional for photo display.
      }
    }),
  );

  return repeatParentByObjectId;
}

export async function fetchSurveyPhotoMap(surveyObjectIds: number[]): Promise<Map<number, SurveyPhoto[]>> {
  const uniqueObjectIds = Array.from(new Set(surveyObjectIds.filter((id) => Number.isFinite(id))));
  const [directPhotos, repeatParents] = await Promise.all([
    fetchLayerAttachments(SURVEY_LAYER_ID, uniqueObjectIds, (objectId) => objectId),
    fetchRepeatParents(uniqueObjectIds),
  ]);
  const repeatPhotos = await fetchLayerAttachments(
    await surveyRepeatTableId().catch(() => -1),
    Array.from(repeatParents.keys()),
    (repeatObjectId) => repeatParents.get(repeatObjectId),
  );

  repeatPhotos.forEach((photos, surveyObjectId) => addPhotos(directPhotos, surveyObjectId, photos));

  return directPhotos;
}
