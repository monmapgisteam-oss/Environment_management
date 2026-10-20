import { fetchSurveyAttachment } from '@/lib/db/survey';
import { hasSurveySession } from '@/lib/survey/session';

type Props = { params: Promise<{ layerId: string; objectId: string; attachmentId: string }> };

// Streams a survey photo from Convex storage without exposing its URL.
export async function GET(_request: Request, props: Props) {
  if (!(await hasSurveySession())) return new Response('Unauthorized', { status: 401 });
  const { layerId, objectId, attachmentId } = await props.params;
  const ids = [layerId, objectId, attachmentId].map(Number);
  if (!ids.every((id) => Number.isInteger(id) && id >= 0)) return new Response('Not found', { status: 404 });
  try {
    const upstream = await fetchSurveyAttachment(ids[0], ids[1], ids[2]);
    const type = upstream?.headers.get('content-type') || '';
    if (!upstream || !type.startsWith('image/')) return new Response('Not found', { status: 404 });
    return new Response(upstream.body, {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'private, max-age=3600',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': "default-src 'none'; sandbox",
      },
    });
  } catch {
    return new Response('Photo could not be loaded.', { status: 502 });
  }
}
