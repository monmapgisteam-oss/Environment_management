import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { arcgisHeaders } from './headers';
import type { Attachment } from '../attachments';
import { applyEdits, layerInfo, serviceToken, serviceUrl } from './service';

export const SIGNED_URL_TTL = 60 * 60;
const REFERENCE = /^arcgis-attachment:(\d+):(\d+)$/;

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for private file access.');
  return secret;
}

export function parseAttachmentReference(reference: string) {
  const match = REFERENCE.exec(reference);
  if (!match) throw new Error('Invalid ArcGIS attachment reference.');
  return { objectId: Number(match[1]), attachmentId: Number(match[2]) };
}

export async function uploadAttachment(file: File, ownerUserId: string): Promise<Attachment> {
  const layer = await layerInfo('tailan_upload');
  if (!layer.hasAttachments) throw new Error('Attachments are not enabled on tailan_upload.');
  const results = await applyEdits([{ id: layer.id, adds: [{ attributes: {
    app_id: randomUUID(), app_ownerUserId: ownerUserId, app_name: file.name, app_createdAt: Date.now(),
  } }] }]);
  const objectId = results[0].addResults?.[0]?.objectId;
  if (objectId == null) throw new Error('ArcGIS did not return an upload record ID.');
  const form = new FormData();
  form.set('f', 'json');
  form.set('token', await serviceToken());
  form.set('attachment', file, file.name);
  try {
    const response = await fetch(`${serviceUrl()}/${layer.id}/${objectId}/addAttachment`, {
      method: 'POST', body: form, cache: 'no-store', signal: AbortSignal.timeout(60_000),
      headers: arcgisHeaders(),
    });
    if (!response.ok) throw new Error(`ArcGIS upload failed (HTTP ${response.status}).`);
    const json = await response.json();
    const result = json.addAttachmentResult;
    if (json.error || !result?.success || !Number.isInteger(result.objectId)) throw new Error('ArcGIS attachment upload failed.');
    return { url: `arcgis-attachment:${objectId}:${result.objectId}`, name: file.name };
  } catch (error) {
    await applyEdits([{ id: layer.id, deletes: [objectId] }]).catch(() => undefined);
    throw error;
  }
}

export async function createSignedUrl(reference: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
  if (!REFERENCE.test(reference)) {
    // Survey123 attachments already live in ArcGIS and keep their existing links.
    if (/^https?:\/\//i.test(reference) || reference.startsWith('/')) return reference;
    throw new Error('Attachment has not been migrated to ArcGIS.');
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
  const { objectId, attachmentId } = parseAttachmentReference(reference);
  const layer = await layerInfo('tailan_upload');
  const url = new URL(`${serviceUrl()}/${layer.id}/${objectId}/attachments/${attachmentId}`);
  // This upstream URL stays on the server; clients receive only file bytes.
  url.searchParams.set('token', await serviceToken());
  const response = await fetch(url, { headers: arcgisHeaders(), cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  if (!response.ok || response.headers.get('content-type')?.includes('application/json')) throw new Error('ArcGIS attachment download failed.');
  return response;
}
