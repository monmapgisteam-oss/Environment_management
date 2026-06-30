import prisma from '@/lib/prisma';

// Survey123 Layer 0 query endpoint — the source of each company's submitted
// survey information, matched back to our reports by register number.
const SURVEY_QUERY_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer/0/query';

export type GeoPoint = {
  lat: number;
  lng: number;
  title: string;
  // label/value pairs shown in the marker popup (the survey information).
  rows: [string, string][];
};

function fmtDate(v: any): string {
  if (v == null || v === '') return '';
  const n = Number(v);
  // ArcGIS dates come back as epoch milliseconds.
  if (!Number.isNaN(n) && n > 1_000_000_000_000) return new Date(n).toISOString().slice(0, 10);
  return String(v);
}

type SurveyRecord = { props: Record<string, any>; coords?: [number, number] };

// Build a register -> survey-record map from the live survey service.
async function fetchSurveyByRegister(): Promise<Record<string, SurveyRecord>> {
  try {
    const res = await fetch(
      `${SURVEY_QUERY_URL}?where=1%3D1&outFields=*&returnGeometry=true&f=geojson`,
      { cache: 'no-store' },
    );
    const json: any = await res.json();
    const map: Record<string, SurveyRecord> = {};
    (json.features || []).forEach((f: any) => {
      const reg = (f.properties?.Register ?? '').toString().trim();
      if (!reg) return;
      map[reg.toUpperCase()] = { props: f.properties || {}, coords: f.geometry?.coordinates };
    });
    return map;
  } catch {
    return {};
  }
}

/**
 * Every company the review organisation has reviewed (reports that were assigned
 * to staff), de-duplicated by register, with that company's survey information
 * for the map popup. Survey geometry is preferred; otherwise the report's own
 * coordinates are used. Companies without any coordinates are omitted.
 */
export async function fetchReviewedCompanyPoints(): Promise<GeoPoint[]> {
  const [reports, survey] = await Promise.all([
    prisma.report.findMany({
      where: { assignments: { some: {} } },
      include: { senderCompany: true, reportType: true, location: true },
      orderBy: { submittedAt: 'desc' },
    }),
    fetchSurveyByRegister(),
  ]);

  const seen = new Set<string>();
  const points: GeoPoint[] = [];

  for (const r of reports as any[]) {
    const register = (r.implementerRegister || r.senderCompany?.registerNumber || '').trim();
    const key = register ? register.toUpperCase() : `report:${r.id}`;
    if (seen.has(key)) continue;

    const s = register ? survey[register.toUpperCase()] : undefined;

    let lat: number | undefined;
    let lng: number | undefined;
    if (s?.coords && s.coords.length >= 2) {
      lng = s.coords[0];
      lat = s.coords[1];
    } else if (r.location?.latitude != null && r.location?.longitude != null) {
      lat = r.location.latitude;
      lng = r.location.longitude;
    }
    if (lat == null || lng == null) continue;

    seen.add(key);

    const rows: [string, string][] = s
      ? [
          ['Байгууллага', s.props.Organization],
          ['Регистрийн дугаар', s.props.Register],
          ['Төслийн нэр', s.props.project_name],
          ['Тайлангийн төрөл', s.props.Report_type],
          ['Огноо', fmtDate(s.props.Project_date)],
          ['Тайлбар', s.props.Description],
        ]
      : [
          ['Байгууллага', r.implementerName || r.senderCompany?.name || ''],
          ['Регистрийн дугаар', register],
          ['Төслийн нэр', r.title],
          ['Тайлангийн төрөл', r.reportType?.name || ''],
          ['Тэмдэглэл', 'Судалгаанд бүртгэгдээгүй'],
        ];

    const title =
      s?.props.Organization || r.implementerName || r.senderCompany?.name || register || 'Байгууллага';

    points.push({
      lat,
      lng,
      title,
      rows: rows.filter(([, v]) => v != null && String(v).trim() !== '') as [string, string][],
    });
  }

  return points;
}
