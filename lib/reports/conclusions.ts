import type { Attachment } from '@/lib/reports/attachments';
import { REPORT_CATEGORIES } from '@/lib/constants';
import { DISTRICTS } from '@/lib/map/mongolia';

export const GENERAL_EVALUATION_CONCLUSION_TITLE = 'Ерөнхий үнэлгээний дүгнэлт';

// Conclusions use the same four project categories as plans and reports.
export const CONCLUSION_PROJECT_CATEGORIES = REPORT_CATEGORIES;

// Projects are in the capital, so the location is one of its nine districts.
export const CONCLUSION_DISTRICTS = DISTRICTS['Улаанбаатар'];
export const CONCLUSION_PROVINCE = 'Улаанбаатар';

export const CONCLUSION_TYPES = [
  'БОНБНҮ хийлгэх шаардлагатай',
  'нөхцөл болзолтойгоор хэрэгжүүлэх боломжтой',
  'нэмэлт тодотгол хийлгэх шаардлагатай',
];

export type ConclusionSearchParams = {
  year?: string;
  number?: string;
  category?: string;
  project?: string;
  district?: string;
  implementer?: string;
  kind?: string;
};

export type ConclusionRow = {
  id: string;
  // The sender's own conclusion number and year; older rows fall back to the
  // system report number and submission year.
  conclusionNumber: string;
  year: string;
  submittedAt: Date | null;
  category: string;
  projectName: string;
  senderCompanyName: string;
  implementerName: string | null;
  district: string | null;
  conclusionType: string;
  status: string;
  // The company signed up but the admin has not approved it yet.
  companyPending: boolean;
  attachments: Attachment[];
};

const includes = (value: string | null | undefined, query: string | null | undefined) =>
  !query || (value || '').toLowerCase().includes(query.toLowerCase());

export function filterConclusions(rows: ConclusionRow[], search: ConclusionSearchParams) {
  return rows.filter((row) => {
    const effectiveImplementer = row.implementerName || row.senderCompanyName;

    return (
      includes(row.year, search.year) &&
      includes(row.conclusionNumber, search.number) &&
      includes(row.category, search.category) &&
      includes(row.projectName, search.project) &&
      includes(row.district, search.district) &&
      includes(effectiveImplementer, search.implementer) &&
      includes(row.conclusionType, search.kind)
    );
  });
}
