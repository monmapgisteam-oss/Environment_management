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

// Templates for the documents of an annual plan, by material id
// (lib/reports/materials.ts): cover page and content for the plan itself, the
// checklist of Журмын 6. Other documents (certificates, licences) have none.
const PLAN_CONTENT_FILES: Record<string, string> = {
  'Уул уурхай, газрын тос': 'plan-content-mining',
  'Аялал жуулчлал, үйлчилгээ': 'plan-content-tourism',
  Үйлдвэрлэл: 'plan-content-industry',
  'Дэд бүтэц, барилга, ШТС': 'plan-content-infrastructure',
};

function planFile(file: string, label: string, page: number, download: string): SampleLink {
  return { href: `/samples/plan/${file}.pdf`, label, page, download };
}

export function samplesForMaterial(
  reportType: string | null | undefined,
  category: string | null | undefined,
  materialId: string,
): SampleLink[] {
  if (reportType !== 'Жилийн төлөвлөгөө' || !category) return [];
  if (materialId === 'plan-checklist') {
    return [planFile('checklist', 'Хяналтын хуудасны загвар (Журмын 6-р хавсралт)', 15, 'Загвар - Хяналтын хуудас.pdf')];
  }
  if (materialId === 'plan-document') {
    const isMining = category === 'Уул уурхай, газрын тос';
    const content = PLAN_CONTENT_FILES[category];
    return [
      planFile(
        isMining ? 'cover-mining' : 'cover-general',
        'Нүүр хуудасны загвар (Журмын 1-р хавсралт)',
        1,
        `Загвар - Төлөвлөгөөний нүүр хуудас (${category}).pdf`,
      ),
      ...(content
        ? [planFile(content, 'Төлөвлөгөөний агуулга, хүснэгтүүд (Журмын 3-р хавсралт)', 3, `Загвар - Төлөвлөгөөний агуулга (${category}).pdf`)]
        : []),
    ];
  }
  return [];
}

export function scoringSheetSample(category: string | null | undefined): SampleLink | null {
  const page = category ? SCORING_SHEET_PAGES[category] : undefined;
  return page ? pdfLink(page, `Үнэлгээний хуудас (Журмын 4-р хавсралт, ${page}-р хуудас)`) : null;
}
