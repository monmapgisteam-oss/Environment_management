import jwt from 'jsonwebtoken';
import type { Attachment } from '@/lib/reports/attachments';
import type { Id } from '@/convex/_generated/dataModel';
import { api } from '@/convex/_generated/api';
import { convex, serverSecret } from './convex';
import dataStore from './index';

// File links are bearer links, so they live 30 minutes; pages make new ones on load.
export const SIGNED_URL_TTL = 30 * 60;
// Stored file references point at an upload record, never at a storage URL.
// File bytes live in Convex storage; both historical reference prefixes work.
const REFERENCE = /^(?:upload|convex-upload):([0-9a-f-]{36})$/i;

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
    return { url: `upload:${upload.id}`, name: file.name };
  } catch (error) {
    await convex().mutation(api.files.remove, { secret: serverSecret(), storageId: storageId as Id<'_storage'> }).catch(() => undefined);
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
  const upload = await dataStore.upload.findUnique({ where: { id: match[1] } });
  if (!upload?.storageId) throw new Error('Attachment file is missing.');
  const url = await convex().query(api.files.url, { secret: serverSecret(), storageId: upload.storageId as Id<'_storage'> });
  if (!url) throw new Error('Attachment file is missing.');
  // Storage URLs stay server-side; the browser receives only file bytes.
  const response = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
  if (!response.ok) throw new Error('Attachment download failed.');
  return response;
}

// Permanently removes uploaded files that a report no longer uses (a file the
// sender replaced or removed while fixing it). App upload references are
// touched; anything else is left alone. File bytes and upload metadata are
// removed together. A failure is logged, not thrown, since the report itself is
// already saved.
export async function deleteUploads(references: string[]) {
  const ids = references.map((reference) => REFERENCE.exec(reference)?.[1]).filter((id): id is string => !!id);
  if (ids.length === 0) return;
  try {
    await convex().mutation(api.files.removeUploads, { secret: serverSecret(), ids });
  } catch (error) {
    console.error('[storage] deleteUploads failed:', error);
  }
}

// Stored references in `before` that are gone from `after`.
export function droppedReferences(before: { url: string }[], after: { url: string }[]) {
  const kept = new Set(after.map((file) => file.url));
  return [...new Set(before.map((file) => file.url))].filter((url) => !kept.has(url));
}
