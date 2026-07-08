import prisma from '@/lib/prisma';
import { SURVEY_EXCLUDED_OBJECT_IDS } from '@/lib/constants';
import { fetchSurveyPhotoMap, type SurveyPhoto } from '@/lib/surveyPhotos';
import { findSenderCompanyByRegister, normalizeRegister } from '@/lib/reportCompanies';
import { normalizeSurveyReportType } from '@/lib/surveyReportType';

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
  arcgisGlobalId: string | null;
  location: { province: string; district: string } | null;
  province: string | null;
  district: string | null;
  khoroo: string | null;
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

function firstString(attrs: Record<string, any>, names: string[]): string | null {
  for (const name of names) {
    const value = toStringOrNull(attrs[name]);
    if (value) return value;
  }
  return null;
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

  const reportType = normalizeSurveyReportType(attrs.Report_type) || 'Survey123';
  const title = toStringOrNull(attrs.project_name) || toStringOrNull(attrs.Organization) || `Survey123 #${objectId}`;
  const organization = toStringOrNull(attrs.Organization);
  const register = toStringOrNull(attrs.Register);
  const matchedCompany = companyByRegister.get(normalizeRegister(register)) || null;
  const submittedMs = toNumber(attrs.CreationDate) || toNumber(attrs.Project_date);
  const arcgisGlobalId = toStringOrNull(attrs.globalid) || toStringOrNull(attrs.GlobalID);
  const province = firstString(attrs, ['aimag_city', 'Aimag_city', 'aimag', 'Aimag', 'province', 'Province', 'city', 'City']);
  const district = firstString(attrs, ['district_duureg', 'District_duureg', 'duureg', 'Duureg', 'district', 'District', 'sum', 'Sum']);
  const khoroo = firstString(attrs, ['bag', 'Bag', 'khoroo', 'Khoroo', 'horoo', 'Horoo']);

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
    arcgisGlobalId,
    location: province || district ? { province: province || '', district: district || '' } : null,
    province,
    district,
    khoroo,
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

async function resolveSurveyReportType(reportTypeName: string | null) {
  const types = await prisma.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
  if (types.length === 0) {
    return prisma.reportType.create({
      data: { name: reportTypeName || 'Survey123', slug: `survey123-${Date.now()}`, isActive: true },
    });
  }

  const name = reportTypeName || '';
  const exact = types.find((type) => type.name === name);
  if (exact) return exact;
  if (name.includes('Жилийн')) {
    const plan = types.find((type) => type.slug === 'type-1' || type.name.includes('Жилийн'));
    if (plan) return plan;
  }
  if (name.includes('Биелэлт')) {
    const performance = types.find((type) => type.slug === 'type-2' || type.name.includes('Биелэлт'));
    if (performance) return performance;
  }
  return types[0];
}

async function resolveSurveyCompany(survey: SurveyReport) {
  const register = survey.register?.trim();
  const matched = await findSenderCompanyByRegister(register);
  if (matched) return matched;

  const registerNumber = register || `SURVEY-${survey.objectId}`;
  return prisma.company.create({
    data: {
      name: survey.organization || registerNumber,
      registerNumber,
      type: 'sender',
    },
    select: { id: true, name: true, registerNumber: true },
  });
}

export async function materializeSurveyReportByObjectId(objectId: number) {
  const reportNumber = `S123-${objectId}`;
  const existing = await prisma.report.findUnique({
    where: { reportNumber },
  });
  if (existing) return existing;

  const survey = await fetchSurveyReportByObjectId(objectId);
  if (!survey) {
    throw new Error('Survey123 тайлан олдсонгүй.');
  }

  const [reportType, senderCompany] = await Promise.all([
    resolveSurveyReportType(survey.reportType.name),
    resolveSurveyCompany(survey),
  ]);
  const submittedAt =
    survey.submittedAt ? new Date(survey.submittedAt) : survey.projectDate ? new Date(survey.projectDate) : new Date();
  const attachments = survey.photos.map((photo) => ({ url: photo.src, name: photo.alt || 'Survey123 photo' }));

  return prisma.report.create({
    data: {
      reportNumber,
      reportTypeId: reportType.id,
      senderCompanyId: senderCompany.id,
      title: survey.title || reportNumber,
      description: survey.description,
      fileUrl: attachments.length ? JSON.stringify(attachments) : null,
      implementerName: survey.organization,
      implementerRegister: survey.register,
      approvedDate: survey.projectDate ? new Date(survey.projectDate) : null,
      status: 'submitted',
      year: submittedAt.getFullYear(),
      submittedAt,
      arcgisGlobalId: survey.arcgisGlobalId,
      ...(survey.lat != null && survey.lng != null
        ? {
            location: {
              create: {
                province: survey.province || 'Тодорхойгүй',
                district: survey.district || 'Тодорхойгүй',
                khoroo: survey.khoroo || 'Тодорхойгүй',
                latitude: survey.lat,
                longitude: survey.lng,
              },
            },
          }
        : {}),
    },
  });
}

export async function syncSurveyReportsForManagerNotifications() {
  const managers = await prisma.user.findMany({
    where: { role: 'review_manager' },
    select: { id: true },
  });
  if (managers.length === 0) return { reportsCreated: 0, notificationsCreated: 0 };

  const surveyReports = await fetchSurveyReports();
  if (surveyReports.length === 0) return { reportsCreated: 0, notificationsCreated: 0 };

  const reportNumbers = surveyReports.map((report) => report.reportNumber);
  const existingReports = await prisma.report.findMany({
    where: { reportNumber: { in: reportNumbers } },
    select: { reportNumber: true },
  });
  const existingReportNumbers = new Set(existingReports.map((report) => report.reportNumber));
  const newSurveys = surveyReports.filter((report) => !existingReportNumbers.has(report.reportNumber));
  if (newSurveys.length === 0) return { reportsCreated: 0, notificationsCreated: 0 };

  const materializedIds: string[] = [];
  for (const survey of newSurveys) {
    try {
      const report = await materializeSurveyReportByObjectId(survey.objectId);
      materializedIds.push(report.id);
    } catch (error) {
      console.error('[surveyReports] failed to materialize survey report', survey.objectId, error);
    }
  }
  if (materializedIds.length === 0) return { reportsCreated: 0, notificationsCreated: 0 };

  const materializedReports = await prisma.report.findMany({
    where: { id: { in: materializedIds } },
    include: { senderCompany: true },
  });
  const existingNotifications = await prisma.notification.findMany({
    where: {
      reportId: { in: materializedIds },
      userId: { in: managers.map((manager) => manager.id) },
      title: 'Survey системээс тайлан ирлээ',
    },
    select: { reportId: true, userId: true },
  });
  const notified = new Set(existingNotifications.map((notification) => `${notification.userId}:${notification.reportId}`));
  const notifications = materializedReports.flatMap((report) =>
    managers
      .filter((manager) => !notified.has(`${manager.id}:${report.id}`))
      .map((manager) => ({
        userId: manager.id,
        reportId: report.id,
        title: 'Survey системээс тайлан ирлээ',
        message: `${report.senderCompany?.name || report.implementerName || 'Survey'}-аас "${report.title}" тайлан Survey системээр ирлээ.`,
      })),
  );

  if (notifications.length > 0) {
    await prisma.notification.createMany({ data: notifications });
  }

  return { reportsCreated: materializedIds.length, notificationsCreated: notifications.length };
}
