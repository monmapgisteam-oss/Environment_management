import prisma from '@/lib/prisma';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';
import { fetchSurveyPhotoMap, type SurveyPhoto } from '@/lib/surveyPhotos';

const SERVICE_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer';
const SURVEY_LAYER_ID = 0;

type RawSurveyFeature = {
  attributes?: Record<string, any>;
  geometry?: { x?: number; y?: number };
};

type CompanyMatch = {
  id: string;
  name: string;
  registerNumber: string;
};

export type SurveyReport = {
  objectId: number;
  id: string;
  reportNumber: string;
  reportType: { name: string };
  title: string;
  submittedAt: string | null;
  status: 'submitted';
  finalScore: null;
  senderCompany: { id?: string; name: string; registerNumber?: string } | null;
  matchedCompany: CompanyMatch | null;
  location: { province: string; district: string } | null;
  register: string | null;
  organization: string | null;
  projectDate: number | null;
  description: string | null;
  lat: number | null;
  lng: number | null;
  photos: SurveyPhoto[];
  source: 'survey123';
  detailHref: string;
};

type FetchSurveyReportsOptions = {
  reportTypeName?: string | null;
  registers?: string[];
};

function normalizeRegister(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function surveyWhere() {
  return `OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`;
}

function toNumber(value: unknown): number | null {
  return typeof value === 'number' ? value : null;
}

function toStringOrNull(value: unknown): string | null {
  const text = String(value ?? '').trim();
  return text || null;
}

async function fetchCompanyMap(registers: string[]) {
  const normalizedRegisters = Array.from(new Set(registers.map(normalizeRegister).filter(Boolean)));
  if (normalizedRegisters.length === 0) return new Map<string, CompanyMatch>();
  const companies = await prisma.company.findMany({
    select: { id: true, name: true, registerNumber: true },
  });
  return new Map(
    companies
      .filter((company) => normalizedRegisters.includes(normalizeRegister(company.registerNumber)))
      .map((company) => [normalizeRegister(company.registerNumber), company]),
  );
}

function toSurveyReport(
  feature: RawSurveyFeature,
  photos: SurveyPhoto[],
  companyByRegister: Map<string, CompanyMatch>,
): SurveyReport | null {
  const attrs = feature.attributes || {};
  const objectId = attrs.objectid ?? attrs.OBJECTID;
  if (typeof objectId !== 'number') return null;

  const reportType = toStringOrNull(attrs.Report_type) || 'Survey123';
  const title = toStringOrNull(attrs.project_name) || toStringOrNull(attrs.Organization) || `Survey123 #${objectId}`;
  const organization = toStringOrNull(attrs.Organization);
  const register = toStringOrNull(attrs.Register);
  const matchedCompany = companyByRegister.get(normalizeRegister(register)) || null;
  const submittedMs = toNumber(attrs.CreationDate) || toNumber(attrs.Project_date);

  return {
    objectId,
    id: `survey-${objectId}`,
    reportNumber: `S123-${objectId}`,
    reportType: { name: reportType },
    title,
    submittedAt: submittedMs ? new Date(submittedMs).toISOString() : null,
    status: 'submitted',
    finalScore: null,
    senderCompany: matchedCompany
      ? { id: matchedCompany.id, name: matchedCompany.name, registerNumber: matchedCompany.registerNumber }
      : { name: organization || register || 'Survey123' },
    matchedCompany,
    location: null,
    register,
    organization,
    projectDate: toNumber(attrs.Project_date),
    description: toStringOrNull(attrs.Description),
    lat: typeof feature.geometry?.y === 'number' ? feature.geometry.y : null,
    lng: typeof feature.geometry?.x === 'number' ? feature.geometry.x : null,
    photos,
    source: 'survey123',
    detailHref: `/report/survey-${objectId}?role=reviewer`,
  };
}

export async function fetchSurveyReports(options: FetchSurveyReportsOptions = {}): Promise<SurveyReport[]> {
  try {
    if (options.registers && options.registers.length === 0) return [];
    const params = new URLSearchParams({
      where: surveyWhere(),
      outFields: '*',
      returnGeometry: 'true',
      resultRecordCount: '2000',
      f: 'json',
    });
    const res = await fetch(`${SERVICE_URL}/${SURVEY_LAYER_ID}/query?${params.toString()}`, {
      cache: 'no-store',
    });
    const json: any = await res.json();
    const features: RawSurveyFeature[] = json.features || [];
    const objectIds = features
      .map((feature) => feature.attributes?.objectid ?? feature.attributes?.OBJECTID)
      .filter((id: unknown): id is number => typeof id === 'number');
    const registers = features.map((feature) => feature.attributes?.Register).map(normalizeRegister).filter(Boolean);
    const [photoMap, companyByRegister] = await Promise.all([
      fetchSurveyPhotoMap(objectIds),
      fetchCompanyMap(registers),
    ]);
    const registerSet =
      options.registers && options.registers.length > 0
        ? new Set(options.registers.map(normalizeRegister).filter(Boolean))
        : null;

    return features
      .map((feature) => {
        const objectId = feature.attributes?.objectid ?? feature.attributes?.OBJECTID;
        return toSurveyReport(
          feature,
          typeof objectId === 'number' ? photoMap.get(objectId) || [] : [],
          companyByRegister,
        );
      })
      .filter((report): report is SurveyReport => !!report)
      .filter((report) => !options.reportTypeName || report.reportType.name === options.reportTypeName)
      .filter((report) => !registerSet || registerSet.has(normalizeRegister(report.register)))
      .sort((a, b) => new Date(b.submittedAt || 0).getTime() - new Date(a.submittedAt || 0).getTime());
  } catch {
    return [];
  }
}

export async function fetchSurveyReportByObjectId(objectId: number): Promise<SurveyReport | null> {
  try {
    const params = new URLSearchParams({
      where: `OBJECTID=${objectId} AND ${surveyWhere()}`,
      outFields: '*',
      returnGeometry: 'true',
      f: 'json',
    });
    const res = await fetch(`${SERVICE_URL}/${SURVEY_LAYER_ID}/query?${params.toString()}`, {
      cache: 'no-store',
    });
    const json: any = await res.json();
    const feature: RawSurveyFeature | undefined = (json.features || [])[0];
    if (!feature) return null;
    const register = normalizeRegister(feature.attributes?.Register);
    const [photoMap, companyByRegister] = await Promise.all([
      fetchSurveyPhotoMap([objectId]),
      fetchCompanyMap(register ? [register] : []),
    ]);
    return toSurveyReport(feature, photoMap.get(objectId) || [], companyByRegister);
  } catch {
    return null;
  }
}
