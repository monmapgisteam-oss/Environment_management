import { NextResponse } from 'next/server';
import { SURVEY_LAYER_ID, querySurvey } from '@/lib/db/survey';
import { hasSurveySession } from '@/lib/survey/session';

// Survey layer 0 as GeoJSON for browser maps and lookups.
// ?register=<value>&match=exact|contains narrows by register number.
export async function GET(request: Request) {
  if (!(await hasSurveySession())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const register = (params.get('register') || '').trim().slice(0, 100);
  const filter = register
    ? { register, registerMatch: params.get('match') === 'contains' ? 'contains' as const : 'iexact' as const }
    : undefined;
  try {
    const features = await querySurvey(SURVEY_LAYER_ID, { filter, returnGeometry: true, resultRecordCount: 2000 });
    return NextResponse.json({
      type: 'FeatureCollection',
      features: features.map((feature) => ({
        type: 'Feature',
        id: feature.attributes.objectid,
        geometry: feature.geometry ? { type: 'Point', coordinates: [feature.geometry.x, feature.geometry.y] } : null,
        properties: feature.attributes,
      })),
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Survey data could not be loaded.' }, { status: 502 });
  }
}
