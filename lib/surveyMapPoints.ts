import type { CompanyPoint } from '@/components/CompanyMap';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';
import { fetchSurveyPhotoMap } from '@/lib/surveyPhotos';

const SERVICE_URL =
  'https://services.arcgis.com/HJzgwvlNIXssnQar/arcgis/rest/services/survey123_2d1e2fe0e49a4623a57f6536b6a6f7c1/FeatureServer';
const SURVEY_LAYER_ID = 0;
const REVERSE_GEOCODE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';
const PROVINCE_NAME_OVERRIDES: Record<string, string> = {
  ulaanbaatar: 'Улаанбаатар',
  'ulan bator': 'Улаанбаатар',
  arkhangai: 'Архангай',
  'bayan-olgii': 'Баян-Өлгий',
  'bayan-ulgii': 'Баян-Өлгий',
  bayankhongor: 'Баянхонгор',
  bulgan: 'Булган',
  'govi-altai': 'Говь-Алтай',
  govisumber: 'Говьсүмбэр',
  'govi-sumber': 'Говьсүмбэр',
  'darkhan-uul': 'Дархан-Уул',
  'darhan-uul': 'Дархан-Уул',
  dornogovi: 'Дорноговь',
  dornod: 'Дорнод',
  dundgovi: 'Дундговь',
  zavkhan: 'Завхан',
  orkhon: 'Орхон',
  ovorkhangai: 'Өвөрхангай',
  uvurkhangai: 'Өвөрхангай',
  omnogovi: 'Өмнөговь',
  umnugovi: 'Өмнөговь',
  sukhbaatar: 'Сүхбаатар',
  selenge: 'Сэлэнгэ',
  tov: 'Төв',
  'töv': 'Төв',
  uvs: 'Увс',
  khovd: 'Ховд',
  hovd: 'Ховд',
  khuvsgul: 'Хөвсгөл',
  khovsgol: 'Хөвсгөл',
  khentii: 'Хэнтий',
  hentiy: 'Хэнтий',
};

type SurveyFeature = {
  attributes?: Record<string, any>;
  geometry: { x: number; y: number };
};

type RawSurveyFeature = {
  attributes?: Record<string, any>;
  geometry?: { x?: number; y?: number };
};

type ReverseLocation = {
  province?: string;
  district?: string;
};

type FetchSurveyMapPointsOptions = {
  registers?: string[];
  locationsByRegister?: Record<string, { province?: string | null; district?: string | null }>;
};

function normalizeRegister(value: unknown): string {
  return String(value ?? '').trim().toUpperCase();
}

function formatDate(value: unknown): string {
  if (typeof value !== 'number') return '';
  return new Date(value).toLocaleDateString('mn-MN');
}

function firstText(attrs: Record<string, any>, names: string[]): string {
  for (const name of names) {
    const value = attrs[name];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

function normalizeProvinceName(value: unknown): string {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  return PROVINCE_NAME_OVERRIDES[raw.toLowerCase()] || raw;
}

function firstAddressText(address: Record<string, any>, names: string[]): string {
  for (const name of names) {
    const value = address[name];
    if (value !== null && value !== undefined && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return '';
}

async function fetchReverseLocationMap(features: SurveyFeature[]): Promise<Map<number, ReverseLocation>> {
  const map = new Map<number, ReverseLocation>();

  for (const feature of features) {
    const objectId = feature.attributes?.objectid ?? feature.attributes?.OBJECTID;
    const x = feature.geometry?.x;
    const y = feature.geometry?.y;
    if (typeof objectId !== 'number' || typeof x !== 'number' || typeof y !== 'number') continue;

    try {
      const params = new URLSearchParams({
        location: `${x},${y}`,
        f: 'json',
        langCode: 'mn',
      });
      const res = await fetch(`${REVERSE_GEOCODE_URL}?${params.toString()}`, {
        cache: 'force-cache',
      });
      if (!res.ok) continue;
      const json: { address?: Record<string, any> } = await res.json();
      const address = json.address || {};
      const province = normalizeProvinceName(firstAddressText(address, ['Region', 'MetroArea']));
      const district = firstAddressText(address, ['District', 'City', 'Subregion', 'PlaceName']);
      if (province || district) map.set(objectId, { province, district });
    } catch {
      // The Survey123 point should still render if reverse geocoding is unavailable.
    }
  }

  return map;
}

export async function fetchSurveyMapPoints(
  options: FetchSurveyMapPointsOptions = {},
): Promise<CompanyPoint[]> {
  try {
    const params = new URLSearchParams({
      where: `OBJECTID NOT IN (${SURVEY_EXCLUDED_OBJECT_IDS.join(',')})`,
      outFields: '*',
      returnGeometry: 'true',
      resultRecordCount: '2000',
      f: 'json',
    });
    const res = await fetch(`${SERVICE_URL}/${SURVEY_LAYER_ID}/query?${params.toString()}`, {
      cache: 'no-store',
    });
    const json: any = await res.json();
    const registerSet =
      options.registers && options.registers.length > 0
        ? new Set(options.registers.map(normalizeRegister).filter(Boolean))
        : null;
    const features: SurveyFeature[] = (json.features || []).flatMap((feature: RawSurveyFeature) => {
      const x = feature.geometry?.x;
      const y = feature.geometry?.y;
      if (typeof x !== 'number' || typeof y !== 'number') return [];
      if (registerSet && !registerSet.has(normalizeRegister(feature.attributes?.Register))) return [];
      return [{ attributes: feature.attributes, geometry: { x, y } }];
    });
    const objectIds = features
      .map((feature) => feature.attributes?.objectid ?? feature.attributes?.OBJECTID)
      .filter((id: unknown): id is number => typeof id === 'number');
    const featuresMissingLocation = features.filter((feature) => {
      const attrs = feature.attributes || {};
      const location = options.locationsByRegister?.[normalizeRegister(attrs.Register)];
      const province =
        firstText(attrs, ['aimag_city', 'Aimag_city', 'aimag', 'Aimag', 'province', 'Province', 'city', 'City', 'hot', 'Hot']) ||
        location?.province;
      const district =
        firstText(attrs, ['district_duureg', 'District_duureg', 'duureg', 'Duureg', 'district', 'District', 'sum', 'Sum', 'soum', 'Soum']) ||
        location?.district;
      return !province || !district;
    });
    const [attachments, reverseLocations] = await Promise.all([
      fetchSurveyPhotoMap(objectIds),
      fetchReverseLocationMap(featuresMissingLocation),
    ]);

    return features.map((feature) => {
      const attrs = feature.attributes || {};
      const objectId = attrs.objectid ?? attrs.OBJECTID;
      const title = attrs.project_name || attrs.Organization || 'Survey123';
      const location = options.locationsByRegister?.[normalizeRegister(attrs.Register)];
      const reverseLocation = reverseLocations.get(objectId);
      const surveyProvince = firstText(attrs, [
        'aimag_city',
        'Aimag_city',
        'aimag',
        'Aimag',
        'province',
        'Province',
        'city',
        'City',
        'hot',
        'Hot',
      ]);
      const surveyDistrict = firstText(attrs, [
        'district_duureg',
        'District_duureg',
        'duureg',
        'Duureg',
        'district',
        'District',
        'sum',
        'Sum',
        'soum',
        'Soum',
      ]);
      return {
        id: `survey:${objectId}`,
        source: 'survey',
        lat: feature.geometry.y,
        lng: feature.geometry.x,
        company: title,
        register: attrs.Register || '',
        reportNumber: '',
        reportType: attrs.Report_type || '',
        location: '',
        status: 'survey',
        score: null,
        description: attrs.Description || '',
        projectDate: formatDate(attrs.Project_date),
        organization: attrs.Organization || '',
        province: surveyProvince || location?.province || reverseLocation?.province || undefined,
        district: surveyDistrict || location?.district || reverseLocation?.district || undefined,
        photos: attachments.get(objectId) || [],
      };
    });
  } catch {
    return [];
  }
}
