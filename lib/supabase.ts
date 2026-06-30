import { createClient } from '@supabase/supabase-js';
import type { Attachment } from '@/lib/attachments';

// Server-side Supabase client used for Storage (file uploads). It uses the
// service-role key, so it must NEVER be imported into client components — only
// inside API routes / server components. The service role bypasses Storage RLS,
// which lets us upload the sender's documents and sign private download links.
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Private bucket where report attachments (PDF/DOCX) live. Files are not public;
// the monitoring team gets short-lived signed URLs (see signAttachments) to open
// or download them.
export const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'tailan_pdf';

// How long a signed download link stays valid (seconds). One hour comfortably
// covers a single review session.
export const SIGNED_URL_TTL = 60 * 60;

if (!supabaseUrl) {
  console.warn('SUPABASE_URL is not set — file uploads to Supabase Storage will fail.');
}
if (!serviceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set — file uploads to Supabase Storage will fail.');
}

export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Makes sure the bucket exists before we upload into it. The bucket is created
// private (it already exists in this project), so attachments are only reachable
// through signed URLs.
let bucketReady = false;
export async function ensureBucket() {
  if (bucketReady) return;
  const { data } = await supabaseAdmin.storage.getBucket(STORAGE_BUCKET);
  if (!data) {
    const { error } = await supabaseAdmin.storage.createBucket(STORAGE_BUCKET, { public: false });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
  bucketReady = true;
}

// Creates a time-limited signed URL for a stored object path. Returns null on
// failure so the caller can degrade gracefully instead of crashing the page.
export async function createSignedUrl(path: string, expiresIn = SIGNED_URL_TTL): Promise<string | null> {
  const { data, error } = await supabaseAdmin.storage.from(STORAGE_BUCKET).createSignedUrl(path, expiresIn);
  if (error || !data) {
    console.error('Failed to create signed URL', error);
    return null;
  }
  return data.signedUrl;
}

// Replaces each attachment's stored object path with a fresh signed URL so the
// monitoring team can open/download files from the private bucket. Legacy entries
// that already hold an absolute or root-relative URL (older public/local uploads)
// are passed through unchanged.
export async function signAttachments(attachments: Attachment[]): Promise<Attachment[]> {
  return Promise.all(
    attachments.map(async (a) => {
      if (/^https?:\/\//i.test(a.url) || a.url.startsWith('/')) return a;
      const signed = await createSignedUrl(a.url);
      return signed ? { ...a, url: signed } : a;
    }),
  );
}
