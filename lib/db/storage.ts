import jwt from 'jsonwebtoken';
import type { Attachment } from '@/lib/reports/attachments';
import { arcgisFetch, arcgisUpload, layerInfo, queryFeatures, sqlString, storedFieldName } from './arcgis';
import dataStore from './index';

export const SIGNED_URL_TTL = 60 * 60;
// Stored file references point at an upload record, never at a storage URL.
// The file itself is the ArcGIS attachment of that record.
const REFERENCE = /^upload:([0-9a-f-]{36})$/i;

// True for a reference to a file uploaded through /api/upload.
export function isUploadReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE.test(value);
}

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for private file access.');
  return secret;
}

// The upload dataset and the ArcGIS object ID of one upload record.
async function uploadFeature(id: string) {
  const layer = await layerInfo('tailan_upload');
  const [feature] = await queryFeatures(layer, `${storedFieldName(layer, 'id')} = ${sqlString(id)}`);
  if (!feature) throw new Error('Attachment not found.');
  return { layer, objectId: feature.attributes[layer.objectIdField] as number, storageId: feature.attributes[storedFieldName(layer, 'storageId')] };
}

export async function uploadAttachment(file: File, ownerUserId: string): Promise<Attachment> {
  const upload = await dataStore.upload.create({ data: { ownerUserId, name: file.name } });
  try {
    const { layer, objectId } = await uploadFeature(upload.id);
    const form = new FormData();
    form.set('attachment', file, file.name);
    const result = await arcgisUpload<{ addAttachmentResult?: { success?: boolean; objectId?: number } }>(`${layer.id}/${objectId}/addAttachment`, form);
    const attachmentId = result.addAttachmentResult?.objectId;
    if (!result.addAttachmentResult?.success || !Number.isInteger(attachmentId)) throw new Error('ArcGIS attachment upload failed.');
    await dataStore.upload.update({ where: { id: upload.id }, data: { storageId: String(attachmentId) } });
    return { url: `upload:${upload.id}`, name: file.name };
  } catch (error) {
    // Deleting the record also deletes any attachment already added to it.
    await dataStore.upload.deleteMany({ where: { id: upload.id } }).catch(() => undefined);
    throw error;
  }
}

export async function createSignedUrl(reference: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
  if (!REFERENCE.test(reference)) {
    // Plain links and other app routes are returned as they are.
    if (/^https?:\/\//i.test(reference) || reference.startsWith('/')) return reference;
    throw new Error('Unknown attachment reference.');
  }
  const token = jwt.sign({ reference }, signingSecret(), { expiresIn, audience: 'tailan-attachment' });
  return `/api/attachments?token=${encodeURIComponent(token)}`;
}

export function verifyAttachmentToken(token: string): string | null {
  try {
    const payload = jwt.verify(token, signingSecret(), { audience: 'tailan-attachment' });
    if (typeof payload === 'string' || typeof payload.reference !== 'string' || !REFERENCE.test(payload.reference)) return null;
    return payload.reference;
  } catch { return null; }
}

export async function signAttachments(attachments: Attachment[]): Promise<Attachment[]> {
  return Promise.all(attachments.map(async (attachment) => ({ ...attachment, url: await createSignedUrl(attachment.url) })));
}

export async function fetchAttachment(reference: string) {
  const match = REFERENCE.exec(reference);
  if (!match) throw new Error('Invalid attachment reference.');
  const { layer, objectId, storageId } = await uploadFeature(match[1]);
  if (!storageId) throw new Error('Attachment file is missing.');
  // The service URL and token stay on the server; clients receive only file bytes.
  const response = await arcgisFetch(`${layer.id}/${objectId}/attachments/${storageId}`);
  if (!response.ok || response.headers.get('content-type')?.includes('application/json')) throw new Error('Attachment download failed.');
  return response;
}

// Permanently removes uploaded files that a report no longer uses (a file the
// sender replaced or removed while fixing it). Only "upload:" references are
// touched; anything else is left alone. Deleting an upload record also deletes
// its attachment. A failure is logged, not thrown, since the report itself is
// already saved.
export async function deleteUploads(references: string[]) {
  const ids = references.map((reference) => REFERENCE.exec(reference)?.[1]).filter((id): id is string => !!id);
  if (ids.length === 0) return;
  try {
    await dataStore.upload.deleteMany({ where: { id: { in: ids } } });
  } catch (error) {
    console.error('[storage] deleteUploads failed:', error);
  }
}

// Stored references in `before` that are gone from `after`.
export function droppedReferences(before: { url: string }[], after: { url: string }[]) {
  const kept = new Set(after.map((file) => file.url));
  return [...new Set(before.map((file) => file.url))].filter((url) => !kept.has(url));
}
