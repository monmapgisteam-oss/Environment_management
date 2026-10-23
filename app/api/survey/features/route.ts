import { NextResponse } from 'next/server';
import { SURVEY_LAYER_ID, querySurvey } from '@/lib/db/survey';
import { getSurveyViewer, surveyRegisterFor } from '@/lib/survey/session';
import { normalizeRegister } from '@/lib/reports/companies';

// Survey layer 0 as GeoJSON for browser maps and lookups.
// ?register=<value>&match=exact|contains narrows by register number. A sender
// always gets only its own register's records, whatever it asks for.
export async function GET(request: Request) {
  const viewer = await getSurveyViewer();
  if (!viewer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const ownRegister = surveyRegisterFor(viewer);
  if (ownRegister === '') return NextResponse.json({ type: 'FeatureCollection', features: [] });
  const params = new URL(request.url).searchParams;
  const register = ownRegister ?? (params.get('register') || '').trim().slice(0, 100);
  const filter = register
    ? {
        register,
        registerMatch: !ownRegister && params.get('match') === 'contains' ? ('contains' as const) : ('iexact' as const),
      }
    : undefined;
  try {
    const features = (await querySurvey(SURVEY_LAYER_ID, { filter, returnGeometry: true, resultRecordCount: 2000 })).filter(
      (feature) => !ownRegister || normalizeRegister(feature.attributes.Register) === ownRegister,
    );
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
