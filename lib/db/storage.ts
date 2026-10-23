import jwt from 'jsonwebtoken';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import type { Attachment } from '@/lib/reports/attachments';
import { convex, serverSecret } from './convex';
import dataStore from './index';

export const SIGNED_URL_TTL = 60 * 60;
// Stored file references point at an upload record, never at a storage URL.
const REFERENCE = /^convex-upload:([0-9a-f-]{36})$/i;

// True for a reference to a file uploaded through /api/upload.
export function isUploadReference(value: unknown): value is string {
  return typeof value === 'string' && REFERENCE.test(value);
}

function signingSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required for private file access.');
  return secret;
}

export async function uploadAttachment(file: File, ownerUserId: string): Promise<Attachment> {
  const uploadUrl = await convex().mutation(api.files.generateUploadUrl, { secret: serverSecret() });
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: { 'Content-Type': file.type || 'application/octet-stream' },
    body: file,
    signal: AbortSignal.timeout(60_000),
  });
  if (!response.ok) throw new Error(`Convex upload failed (HTTP ${response.status}).`);
  const { storageId } = await response.json() as { storageId: string };
  try {
    const upload = await dataStore.upload.create({ data: { ownerUserId, name: file.name, storageId } });
    return { url: `convex-upload:${upload.id}`, name: file.name };
  } catch (error) {
    await convex().mutation(api.files.remove, { secret: serverSecret(), storageId: storageId as Id<'_storage'> }).catch(() => undefined);
    throw error;
  }
}

export async function createSignedUrl(reference: string, expiresIn = SIGNED_URL_TTL): Promise<string> {
  if (!REFERENCE.test(reference)) {
    // Survey photos and other app routes keep their existing links.
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
  const upload = await dataStore.upload.findUnique({ where: { id: match[1] } });
  if (!upload?.storageId) throw new Error('Attachment not found.');
  const url = await convex().query(api.files.url, { secret: serverSecret(), storageId: upload.storageId as Id<'_storage'> });
  if (!url) throw new Error('Attachment file is missing.');
  // The storage URL stays on the server; clients receive only file bytes.
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error('Attachment download failed.');
  return response;
}

// Permanently removes uploaded files that a report no longer uses (a file the
// sender replaced or removed while fixing it). Only "convex-upload:" references
// are touched; anything else is left alone. A failure is logged, not thrown,
// since the report itself is already saved.
export async function deleteUploads(references: string[]) {
  const ids = references.map((reference) => REFERENCE.exec(reference)?.[1]).filter((id): id is string => !!id);
  if (ids.length === 0) return;
  try {
    const uploads = await dataStore.upload.findMany({ where: { id: { in: ids } } });
    for (const upload of uploads) {
      if (upload.storageId) {
        await convex()
          .mutation(api.files.remove, { secret: serverSecret(), storageId: upload.storageId as Id<'_storage'> })
          .catch((error) => console.error('[storage] file removal failed:', error));
      }
    }
    await dataStore.upload.deleteMany({ where: { id: { in: uploads.map((upload) => upload.id) } } });
  } catch (error) {
    console.error('[storage] deleteUploads failed:', error);
  }
}

// Stored references in `before` that are gone from `after`.
export function droppedReferences(before: { url: string }[], after: { url: string }[]) {
  const kept = new Set(after.map((file) => file.url));
  return [...new Set(before.map((file) => file.url))].filter((url) => !kept.has(url));
}
