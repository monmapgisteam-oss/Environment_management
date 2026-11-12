import dataStore from './index';
import { applyEdits, layerInfo, queryFeatures, storedFieldName } from './arcgis';
import { referencedUploadIds } from './storage';

const DAY = 24 * 60 * 60 * 1000;

// Uploads no record points at (a form left unsent, a replaced file, a failed
// sign-up) are deleted once they are a week old: long enough for anyone
// still filling a form, short enough that stray copies of documents do not
// pile up.
export async function sweepOrphanUploads(olderThanMs = 7 * DAY): Promise<number> {
  const [uploads, used] = await Promise.all([
    dataStore.upload.findMany({ select: { id: true, createdAt: true } }),
    referencedUploadIds(),
  ]);
  const cutoff = Date.now() - olderThanMs;
  const orphans = uploads
    .filter((upload) => !used.has(upload.id.toLowerCase()) && upload.createdAt.getTime() < cutoff)
    .map((upload) => upload.id);
  if (orphans.length) await dataStore.upload.deleteMany({ where: { id: { in: orphans } } });
  return orphans.length;
}

// Attempt counters and sign-out records (tailan_rateLimit) that no longer
// matter. Every record is useless 12 hours after its resetAt: counter windows
// have ended, and sign-out records outlive any session they could end
// (sessions end 12 hours after sign-in).
export async function sweepExpiredCounters(): Promise<number> {
  const layer = await layerInfo('tailan_rateLimit');
  const cutoff = Date.now() - 13 * 60 * 60 * 1000;
  // resetAt is a date field; reading the rows and comparing epoch values
  // avoids database-specific date syntax in the query.
  const field = storedFieldName(layer, 'resetAt');
  const expired = (await queryFeatures(layer)).filter((feature) => Number(feature.attributes[field]) < cutoff);
  const ids = expired.map((feature) => feature.attributes[layer.objectIdField] as number);
  for (let i = 0; i < ids.length; i += 500) await applyEdits([{ id: layer.id, deletes: ids.slice(i, i + 500) }]);
  return ids.length;
}
