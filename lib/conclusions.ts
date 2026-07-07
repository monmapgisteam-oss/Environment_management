import type { Attachment } from '@/lib/attachments';

export const GENERAL_EVALUATION_CONCLUSION_TITLE = 'Ерөнхий үнэлгээний дүгнэлт';

export const CONCLUSION_PROJECT_CATEGORIES = [
  'Үйлчилгээний салбарын төсөл',
  'Уул уурхайн төсөл',
  'Бусад төсөл',
  'Дэд бүтцийн хөгжлийн төсөл',
  'Биологийн төрөл зүйлийн төсөл',
  'Тусгай хамгаалалттай газар нутагт явуулах үйл ажиллагаа',
  'Химийн хортой болон цацраг идэвхт бодис, аюултай хаягдлын төсөл',
  'Хөнгөн хүнсний үйлдвэрийн төсөл',
  'Хувиргасан амьд организмтай холбоотой үйлдвэрлэл, үйлчилгээ эрхлэх',
  'Хүнд үйлдвэрийн төсөл',
  'Хөдөө аж ахуйн төсөл',
];

export const CONCLUSION_PROVINCES = [
  'Архангай',
  'Баян-Өлгий',
  'Баянхонгор',
  'Булган',
  'Говь-Алтай',
  'Говьсүмбэр',
  'Дархан-Уул',
  'Дорноговь',
  'Дорнод',
  'Дундговь',
  'Завхан',
  'Орхон',
  'Өвөрхангай',
  'Өмнөговь',
  'Сүхбаатар',
  'Сэлэнгэ',
  'Төв',
  'Увс',
  'Ховд',
  'Хөвсгөл',
  'Хэнтий',
];

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
  province?: string;
  implementer?: string;
  kind?: string;
};

export type ConclusionRow = {
  id: string;
  reportNumber: string;
  submittedAt: Date | null;
  reportTypeName: string;
  title: string;
  senderCompanyName: string;
  implementerName: string | null;
  province: string | null;
  district: string | null;
  conclusionType: string;
  status: string;
  attachments: Attachment[];
};

const includes = (value: string | null | undefined, query: string | null | undefined) =>
  !query || (value || '').toLowerCase().includes(query.toLowerCase());

export function filterConclusions(rows: ConclusionRow[], search: ConclusionSearchParams) {
  return rows.filter((row) => {
    const submittedYear = row.submittedAt ? String(row.submittedAt.getFullYear()) : '';
    const effectiveImplementer = row.implementerName || row.senderCompanyName;

    return (
      includes(submittedYear, search.year) &&
      includes(row.reportNumber, search.number) &&
      includes(row.reportTypeName, search.category) &&
      includes(row.title, search.project) &&
      includes(row.province, search.province) &&
      includes(effectiveImplementer, search.implementer) &&
      includes(row.conclusionType, search.kind)
    );
  });
}
