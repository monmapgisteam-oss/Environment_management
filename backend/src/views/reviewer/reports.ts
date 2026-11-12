import dataStore from '@/lib/db';
import { attachEffectiveSenderCompanies } from '@/lib/reports/companies';
import { GENERAL_EVALUATION_CONCLUSION_TITLE } from '@shared/reports/conclusions';
import { defineView } from '../define';

async function fetchReportTypes() {
  return dataStore.reportType.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}

async function fetchAllReports(typeSlug?: string) {
  const reports = await dataStore.report.findMany({
    // Drafts belong to the sender only; never surface them to the reviewer.
    where: {
      status: { not: 'draft' },
      title: { not: GENERAL_EVALUATION_CONCLUSION_TITLE },
      ...(typeSlug ? { reportType: { slug: typeSlug } } : {}),
    },
    include: {
      reportType: true,
      senderCompany: true,
      location: true,
    },
    orderBy: { submittedAt: 'desc' },
  });
  return attachEffectiveSenderCompanies(reports);
}

// Every received report, or those of one type (?type=<slug>).
export default defineView({
  name: 'reviewer/reports',
  roles: ['review_manager'],
  async load({ query }) {
    const type = query.get('type') || undefined;
    const [reportTypes, reports] = await Promise.all([fetchReportTypes(), fetchAllReports(type)]);
    const selectedType = type ? reportTypes.find((rt) => rt.slug === type) ?? null : null;
    return { selectedType, reports };
  },
});
