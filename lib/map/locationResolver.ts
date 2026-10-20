import { DISTRICTS, PROVINCES } from '@/lib/map/mongolia';

export type AdministrativeLocation = {
  province?: string;
  district?: string;
  khoroo?: string;
};

type LocationPoint = {
  lat: number;
  lng: number;
  province?: string | null;
  district?: string | null;
  location?: string | null;
};

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
const ARCGIS_REVERSE_URL = 'https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode';

const PROVINCE_OVERRIDES: Record<string, string> = {
  ulaanbaatar: 'Улаанбаатар',
  ulaanbaatarcity: 'Улаанбаатар',
  arkhangai: 'Архангай',
  bayankhongor: 'Баянхонгор',
  bayanolgii: 'Баян-Өлгий',
  bayanulgii: 'Баян-Өлгий',
  bulgan: 'Булган',
  darkhanuul: 'Дархан-Уул',
  dornod: 'Дорнод',
  dornogovi: 'Дорноговь',
  dundgovi: 'Дундговь',
  govialtai: 'Говь-Алтай',
  govisumber: 'Говьсүмбэр',
  khentii: 'Хэнтий',
  khovd: 'Ховд',
  khuvsgul: 'Хөвсгөл',
  orkhon: 'Орхон',
  ovorkhangai: 'Өвөрхангай',
  ovurkhangai: 'Өвөрхангай',
  omnogovi: 'Өмнөговь',
  selenge: 'Сэлэнгэ',
  sukhbaatar: 'Сүхбаатар',
  tuv: 'Төв',
  tovgovi: 'Төв',
  uvs: 'Увс',
  zavkhan: 'Завхан',
};

const DISTRICT_OVERRIDES: Record<string, string> = {
  baganuur: 'Багануур',
  bagakhangai: 'Багахангай',
  bayangol: 'Баянгол',
  bayanzurkh: 'Баянзүрх',
  nalaikh: 'Налайх',
  nalaih: 'Налайх',
  songinokhairkhan: 'Сонгинохайрхан',
  songinokharkhan: 'Сонгинохайрхан',
  sukhbaatar: 'Сүхбаатар',
  khanuul: 'Хан-Уул',
  chingeltei: 'Чингэлтэй',
};

function cleanText(value?: string | null) {
  const text = value?.trim();
  if (!text || text.toLowerCase().includes('тодорхойгүй')) return undefined;
  return text;
}

function key(value?: string | null) {
  return (value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '');
}

function firstText(source: Record<string, unknown> | undefined, fields: string[]) {
  if (!source) return undefined;
  for (const field of fields) {
    const value = source[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return undefined;
}

function canonicalName(value: string | undefined, names: string[], overrides: Record<string, string> = {}) {
  const text = cleanText(value);
  if (!text) return undefined;
  const textKey = key(text);
  if (overrides[textKey]) return overrides[textKey];
  const match = names.find((name) => key(name) === textKey);
  return match || text;
}

function findKnownNameInText(text: string | null | undefined, names: string[]) {
  const textKey = key(text);
  if (!textKey) return undefined;
  return names.find((name) => textKey.includes(key(name)));
}

export function extractSurveyLocation(attrs: Record<string, unknown> | undefined): AdministrativeLocation {
  return {
    province: canonicalName(
      firstText(attrs, ['aimag_city', 'Aimag_city', 'aimag', 'Aimag', 'province', 'Province', 'city', 'City', 'hot', 'Hot']),
      PROVINCES,
      PROVINCE_OVERRIDES,
    ),
    district: canonicalName(
      firstText(attrs, ['district_duureg', 'District_duureg', 'duureg', 'Duureg', 'district', 'District', 'sum', 'Sum', 'soum', 'Soum']),
      Object.values(DISTRICTS).flat(),
      DISTRICT_OVERRIDES,
    ),
  };
}

export function extractNominatimLocation(data: any): AdministrativeLocation {
  const address = data?.address || {};
  const province = canonicalName(
    firstText(address, ['state', 'province', 'city', 'county', 'region']),
    PROVINCES,
    PROVINCE_OVERRIDES,
  );
  const districtNames = province ? DISTRICTS[province] || [] : Object.values(DISTRICTS).flat();
  const district = canonicalName(
    firstText(address, ['city_district', 'district', 'municipality', 'county', 'suburb', 'town', 'village']),
    districtNames,
    DISTRICT_OVERRIDES,
  );
  return { province, district };
}

function extractArcgisLocation(data: any): AdministrativeLocation {
  const address = data?.address || {};
  const province = canonicalName(
    firstText(address, ['Region', 'MetroArea', 'City', 'Subregion']),
    PROVINCES,
    PROVINCE_OVERRIDES,
  );
  const districtNames = province ? DISTRICTS[province] || [] : Object.values(DISTRICTS).flat();
  const district = canonicalName(
    firstText(address, ['District', 'City', 'Subregion', 'PlaceName', 'Neighborhood']),
    districtNames,
    DISTRICT_OVERRIDES,
  );
  return { province, district };
}

async function reverseGeocodeLocation(lat: number, lng: number): Promise<AdministrativeLocation> {
  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
      'accept-language': 'mn',
    });
    const res = await fetch(`${NOMINATIM_REVERSE_URL}?${params.toString()}`, {
      headers: { 'User-Agent': 'tailan-location-resolver/1.0' },
      cache: 'no-store',
    });
    if (res.ok) {
      const location = extractNominatimLocation(await res.json());
      if (location.province && location.district) return location;
      if (location.province || location.district) return location;
    }
  } catch {
    // Try the ArcGIS reverse geocoder below.
  }

  try {
    const params = new URLSearchParams({
      location: `${lng},${lat}`,
      distance: '50000',
      outSR: '4326',
      f: 'json',
    });
    const res = await fetch(`${ARCGIS_REVERSE_URL}?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) return {};
    return extractArcgisLocation(await res.json());
  } catch {
    return {};
  }
}

export async function resolveReportPointLocations<T extends LocationPoint>(points: T[]): Promise<T[]> {
  const cache = new Map<string, AdministrativeLocation>();

  return Promise.all(
    points.map(async (point) => {
      const savedProvince = canonicalName(cleanText(point.province), PROVINCES, PROVINCE_OVERRIDES);
      const savedDistrict = canonicalName(
        cleanText(point.district),
        savedProvince ? DISTRICTS[savedProvince] || [] : Object.values(DISTRICTS).flat(),
        DISTRICT_OVERRIDES,
      );
      const addressProvince = findKnownNameInText(point.location, PROVINCES);
      const province = savedProvince || addressProvince;
      const addressDistrict = findKnownNameInText(
        point.location,
        province ? DISTRICTS[province] || [] : Object.values(DISTRICTS).flat(),
      );
      const district = savedDistrict || addressDistrict;

      if (province && district) return { ...point, province, district };

      const cacheKey = `${point.lat.toFixed(5)},${point.lng.toFixed(5)}`;
      let reversed = cache.get(cacheKey);
      if (!reversed) {
        reversed = await reverseGeocodeLocation(point.lat, point.lng);
        cache.set(cacheKey, reversed);
      }

      return {
        ...point,
        province: province || reversed.province || point.province,
        district: district || reversed.district || point.district,
      };
    }),
  );
}
