import { fetchAttachment, verifyAttachmentToken } from '@/lib/db/storage';

const EXTENSION: Record<string, string> = { 'application/pdf': '.pdf', 'image/png': '.png', 'image/jpeg': '.jpg' };

// The saved file name. The `download` parameter is not signed, so it only
// chooses the name: the extension always follows the file's real type, and
// any other type is saved as a plain ".bin" file.
function downloadName(requested: string | null, type: string | null): string | null {
  if (!requested && type) return null;
  const base = (requested ?? 'file')
    .replace(/[\u0000-\u001f\u007f/\\]/g, '')
    .replace(/\.[^.]*$/, '')
    .trim()
    .slice(0, 120) || 'file';
  return `${base}${(type && EXTENSION[type]) || '.bin'}`;
}

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const reference = verifyAttachmentToken(params.get('token') || '');
  if (!reference) {
    return new Response('Файлын холбоосын хугацаа дууссан байна. Хуудсаа дахин ачаалаад нээнэ үү.', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
  try {
    const upstream = await fetchAttachment(reference);
    // Only PDFs and raster images open in the browser; anything else (older
    // uploads of other kinds) is downloaded as an opaque file.
    const upstreamType = (upstream.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
    const inline = ['application/pdf', 'image/png', 'image/jpeg'].includes(upstreamType);
    const headers = new Headers({
      'Content-Type': inline ? upstreamType : 'application/octet-stream',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      // The link carries a bearer token; never pass it on as a Referer.
      'Referrer-Policy': 'no-referrer',
    });
    const filename = downloadName(params.get('download'), inline ? upstreamType : null);
    if (filename) headers.set('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(filename).replace(/'/g, '%27')}`);
    return new Response(upstream.body, { headers });
  } catch {
    return new Response('Файлыг татаж чадсангүй. Дахин оролдоно уу.', { status: 502, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  }
}
