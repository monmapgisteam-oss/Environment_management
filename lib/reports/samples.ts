// Approved templates from the regulation ("Загварууд" PDF, served from
// public/samples). Each scoring criterion is a subject of the report, and
// Журмын 3 дугаар хавсралтын А хэсэг holds the approved table for that subject
// per report category, so the link opens the PDF on that page. Журмын 4 дүгээр
// хавсралт holds the scoring sheet evaluators fill in.

export const SAMPLE_PDF_URL = '/samples/bomt-zagvaruud.pdf';

export type SampleLink = { href: string; label: string; page: number; download?: string };

// Per-table files cut from the PDF by scripts/split-sample-tables.py:
// public/samples/<category folder>/<subject>.pdf
const CATEGORY_FOLDERS: Record<string, string> = {
  'Уул уурхай, газрын тос': 'mining',
  'Аялал жуулчлал, үйлчилгээ': 'tourism',
  Үйлдвэрлэл: 'industry',
  'Дэд бүтэц, барилга, ШТС': 'infrastructure',
};

// Keyword found at the start of a criterion name → subject file and the PDF
// page it was cut from, per category. The first matching keyword wins.
const SUBJECT_PAGES: Record<string, [keyword: string, file: string, page: number][]> = {
  'Уул уурхай, газрын тос': [
    ['Сөрөг нөлөөллийг', 'negative-impact', 4],
    ['Нөхөн сэргээлт', 'rehabilitation', 4],
    ['Биологийн олон янз', 'biodiversity', 4],
    ['Нүүлгэн шилжүүлэх', 'resettlement', 4],
    ['Түүх, соёлын', 'heritage', 4],
    ['Осол, эрсдэл', 'risk', 4],
    ['Хог, хаягдл', 'waste', 4],
    ['Орчны хяналт', 'monitoring', 5],
    ['Удирдлага зохион', 'management', 5],
    ['Аймаг, сумын', 'reporting', 5],
    ['Нөлөөллийн бүсийн', 'reporting', 5],
  ],
  'Аялал жуулчлал, үйлчилгээ': [
    ['Сөрөг нөлөөллийг', 'negative-impact', 5],
    ['Орчны тохижилт', 'landscaping', 6],
    ['Түүх, соёлын', 'heritage', 6],
    ['Хог, хаягдл', 'waste', 6],
    ['Орчны хяналт', 'monitoring', 6],
    ['Удирдлага зохион', 'management', 6],
    ['Нөлөөллийн бүсийн', 'reporting', 6],
  ],
  Үйлдвэрлэл: [
    ['Сөрөг нөлөөллийг', 'negative-impact', 7],
    ['Орчны тохижилт', 'landscaping', 7],
    ['Түүх, соёлын', 'heritage', 7],
    ['Осол, эрсдэл', 'risk', 7],
    ['Хог, хаягдл', 'waste', 7],
    ['Орчны хяналт', 'monitoring', 7],
    ['Удирдлага зохион', 'management', 8],
    ['Нөлөөллийн бүсийн', 'reporting', 8],
  ],
  'Дэд бүтэц, барилга, ШТС': [
    ['Сөрөг нөлөөллийг', 'negative-impact', 8],
    ['Орчны тохижилт', 'landscaping', 8],
    ['Түүх, соёлын', 'heritage', 8],
    ['Осол, эрсдэл', 'risk', 8],
    ['Хог, хаягдл', 'waste', 9],
    ['Орчны хяналт', 'monitoring', 9],
    ['Удирдлага зохион', 'management', 9],
    ['Нөлөөллийн бүсийн', 'reporting', 9],
  ],
};

// Журмын 4 дүгээр хавсралт: the scoring sheet of each category.
const SCORING_SHEET_PAGES: Record<string, number> = {
  'Уул уурхай, газрын тос': 12,
  'Аялал жуулчлал, үйлчилгээ': 13,
  Үйлдвэрлэл: 13,
  'Дэд бүтэц, барилга, ШТС': 14,
};

function pdfLink(page: number, label: string): SampleLink {
  return { href: `${SAMPLE_PDF_URL}#page=${page}`, label, page };
}

function normalize(text: string) {
  return text.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

// Short file name the browser saves the table under.
function downloadName(category: string, criterionName: string) {
  const subject = criterionName.replace(/\s*\/.*$/, '').split(' ').slice(0, 4).join(' ');
  return `Загвар - ${subject} (${category}).pdf`;
}

// The approved table for a criterion's subject as its own small PDF, or null
// when the regulation has none for it.
export function sampleForCriterion(category: string | null | undefined, criterionName: string): SampleLink | null {
  const subjects = category ? SUBJECT_PAGES[category] : undefined;
  if (!subjects) return null;
  const name = normalize(criterionName);
  const match = subjects.find(([keyword]) => name.includes(normalize(keyword)));
  if (!match) return null;
  const [, file, page] = match;
  return {
    href: `/samples/${CATEGORY_FOLDERS[category as string]}/${file}.pdf`,
    label: `Загвар хүснэгт татах (Журмын 3-р хавсралт, ${page}-р хуудас)`,
    page,
    download: downloadName(category as string, criterionName),
  };
}

// Template of a plan table, by material id (lib/reports/materials.ts): a plan
// row "plan-<file>" is the same table of Журмын 3 дугаар хавсралтын А хэсэг
// that the criterion samples above are cut from.
export function samplesForMaterial(
  reportType: string | null | undefined,
  category: string | null | undefined,
  material: { id: string; label: string },
): SampleLink[] {
  if (reportType !== 'Жилийн төлөвлөгөө' || !category || !material.id.startsWith('plan-')) return [];
  const file = material.id.slice('plan-'.length);
  const match = SUBJECT_PAGES[category]?.find(([, subjectFile]) => subjectFile === file);
  if (!match) return [];
  const page = match[2];
  return [
    {
      href: `/samples/${CATEGORY_FOLDERS[category]}/${file}.pdf`,
      label: `Загвар хүснэгт татах (Журмын 3-р хавсралт, ${page}-р хуудас)`,
      page,
      download: downloadName(category, material.label),
    },
  ];
}

// The approved cover page of the plan (Журмын 1 дүгээр хавсралт).
export function planCoverSample(category: string | null | undefined): SampleLink | null {
  if (!category || !CATEGORY_FOLDERS[category]) return null;
  const isMining = category === 'Уул уурхай, газрын тос';
  return {
    href: `/samples/plan/${isMining ? 'cover-mining' : 'cover-general'}.pdf`,
    label: 'Төлөвлөгөөний нүүр хуудасны загвар (Журмын 1-р хавсралт)',
    page: 1,
    download: `Загвар - Төлөвлөгөөний нүүр хуудас (${category}).pdf`,
  };
}

export function scoringSheetSample(category: string | null | undefined): SampleLink | null {
  const page = category ? SCORING_SHEET_PAGES[category] : undefined;
  return page ? pdfLink(page, `Үнэлгээний хуудас (Журмын 4-р хавсралт, ${page}-р хуудас)`) : null;
}
