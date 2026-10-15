import { fetchAttachment, verifyAttachmentToken } from '@/lib/db/storage';

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reference = verifyAttachmentToken(params.get('token') || '');
  if (!reference) return new Response('Invalid or expired file link.', { status: 401 });
  try {
    const upstream = await fetchAttachment(reference);
    const headers = new Headers({
      'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    const filename = params.get('download');
    if (filename) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename).replace(/'/g, '%27')}`);
    return new Response(upstream.body, { headers });
  } catch {
    return new Response('File could not be downloaded.', { status: 502 });
  }
}
