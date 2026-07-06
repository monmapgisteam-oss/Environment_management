const SERVICE_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer';
const SURVEY_LAYER_ID = 0;
const REPEAT_TABLE_ID = 1;
const SURVEY_REPEAT_RELATIONSHIP_ID = 1;

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
        const params = new URLSearchParams({
          objectIds: ids.join(','),
          f: 'json',
        });
        const res = await fetch(`${SERVICE_URL}/${layerId}/queryAttachments?${params.toString()}`, {
          cache: 'no-store',
        });
        const json: { attachmentGroups?: AttachmentGroup[] } = await res.json();
        (json.attachmentGroups || []).forEach((group) => {
          const parentObjectId = parentForAttachmentObjectId(group.parentObjectId);
          if (parentObjectId === undefined) return;
          const photos = (group.attachmentInfos || [])
            .filter((attachment) => attachment.contentType?.startsWith('image/'))
            .map((attachment) => ({
              src: `${SERVICE_URL}/${layerId}/${group.parentObjectId}/attachments/${attachment.id}`,
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

async function fetchRepeatParents(surveyObjectIds: number[]): Promise<Map<number, number>> {
  const repeatParentByObjectId = new Map<number, number>();
  if (surveyObjectIds.length === 0) return repeatParentByObjectId;

  await Promise.all(
    chunk(surveyObjectIds, 100).map(async (ids) => {
      try {
        const params = new URLSearchParams({
          objectIds: ids.join(','),
          relationshipId: String(SURVEY_REPEAT_RELATIONSHIP_ID),
          outFields: 'objectid',
          returnGeometry: 'false',
          f: 'json',
        });
        const res = await fetch(`${SERVICE_URL}/${SURVEY_LAYER_ID}/queryRelatedRecords?${params.toString()}`, {
          cache: 'no-store',
        });
        const json: any = await res.json();
        (json.relatedRecordGroups || []).forEach((group: any) => {
          const surveyObjectId = group.objectId;
          if (typeof surveyObjectId !== 'number') return;
          (group.relatedRecords || []).forEach((record: any) => {
            const repeatObjectId = record.attributes?.objectid ?? record.attributes?.OBJECTID;
            if (typeof repeatObjectId === 'number') {
              repeatParentByObjectId.set(repeatObjectId, surveyObjectId);
            }
          });
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
    REPEAT_TABLE_ID,
    Array.from(repeatParents.keys()),
    (repeatObjectId) => repeatParents.get(repeatObjectId),
  );

  repeatPhotos.forEach((photos, surveyObjectId) => addPhotos(directPhotos, surveyObjectId, photos));

  return directPhotos;
}
