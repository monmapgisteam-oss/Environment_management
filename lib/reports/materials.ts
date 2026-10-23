import type { Attachment } from '@/lib/reports/attachments';

// Documents a report must attach, per report type and category. A plan attaches
// each table of Журмын 3 дугаар хавсралтын А хэсэг; a performance report uses
// "Тайлангийн хавсралтууд" from Журмын 3 дугаар хавсралтын Б хэсэг. Both start
// with the project introduction.
// Uploaded files carry the item's `id` as `materialId`. Ids are shared between
// categories where the regulation asks for the same thing.

export type ReportMaterial = {
  id: string;
  label: string;
  // The regulation's own instruction for the photos, shown under the label.
  note?: string;
};

const MONITORING_PHOTOS_NOTE = 'цэг бүр дээр 2-оос доошгүй';
const PER_MEASURE_PHOTOS_NOTE = 'арга хэмжээ бүрт 2-оос доошгүй орчны фонтой хамт авсан гэрэл зураг хавсаргах';
const PER_MEASURE_BACKGROUND_NOTE = 'арга хэмжээ бүрт орчны фонтой хамт авсан 2-оос доошгүй гэрэл зураг хавсаргах';
const BEFORE_DURING_AFTER_NOTE =
  'нэгж талбай бүр дээр хийхээс өмнө, хийж байх үеийн, хийсний дараах байдлыг харуулсан гэрэл зургууд хавсаргах';
const PER_WORK_NOTE = 'гүйцэтгэсэн ажил тус бүрт орчны фоныг оруулан авсан 2-оос доошгүй гэрэл зургийг хавсаргах';

const LAB_RESULTS: ReportMaterial = {
  id: 'lab-results',
  label: 'Орчны хяналт шинжилгээний хөтөлбөрийн хүрээнд хийсэн хээрийн хэмжилт, авсан дээжнүүдийн лабораторийн шинжилгээний үр дүн эх хувиар',
};
const MITIGATION_PHOTOS: ReportMaterial = {
  id: 'mitigation-photos',
  label: 'Сөрөг нөлөөллийг бууруулах арга хэмжээнүүдийн гүйцэтгэлийг баталгаажуулсан гэрэл зураг',
  note: PER_MEASURE_PHOTOS_NOTE,
};
const HAZARDOUS_WASTE_PHOTOS: ReportMaterial = {
  id: 'hazardous-waste-photos',
  label: 'Аюултай хог хаягдлыг устгах, хадгалах арга хэмжээг хэрхэн гүйцэтгэснийг нотлох гэрэл зураг',
  note: PER_MEASURE_BACKGROUND_NOTE,
};
const LOCAL_WASTE_AGREEMENT: ReportMaterial = {
  id: 'local-waste-agreement',
  label: 'Орон нутагтай байгуулсан хог хаягдлын гэрээ, түүний биелэлтийг нотлох баримтууд, гэрэл зургууд',
};
const ACCEPTANCE_ACTS: ReportMaterial = {
  id: 'acceptance-acts',
  label: 'Эрх бүхий байгууллагуудаас гүйцэтгэсэн ажлыг хүлээж авсан актын хуулбар',
};

function monitoringPhotos(scope: string): ReportMaterial {
  return {
    id: 'monitoring-photos',
    label: `Орчны хяналт шинжилгээний хөтөлбөрийн хүрээнд ${scope}хэмжилт, дээжлэлт хийж буй агшныг баталгаажуулсан, төсөл хэрэгжиж буй орчны фонтой хамт авсан гэрэл зураг`,
    note: MONITORING_PHOTOS_NOTE,
  };
}

export const REPORT_MATERIALS: Record<string, ReportMaterial[]> = {
  // б. Уул уурхайн төсөл
  'Уул уурхай, газрын тос': [
    monitoringPhotos('байгаль орчны бүрдэл хэсгүүд тус бүр дээр '),
    LAB_RESULTS,
    MITIGATION_PHOTOS,
    {
      id: 'rehabilitation',
      label: 'Нөхөн сэргээлтийн ажлын гүйцэтгэлийг харуулсан гэрэл зураг, нөхөн сэргээлтийн ажлыг гүйцэтгэсэн ажлын зардлын нотлох баримтууд',
      note: BEFORE_DURING_AFTER_NOTE,
    },
    {
      id: 'biodiversity-offset-photos',
      label: 'Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээ',
      note: PER_MEASURE_BACKGROUND_NOTE,
    },
    {
      id: 'chemical-usage',
      label: 'Батлагдсан уулын ажлын төлөвлөгөөнд үндэслэн зарцуулсан химийн хортой болон аюултай бодисын ашиглалтын дүн мэдээ',
    },
    HAZARDOUS_WASTE_PHOTOS,
    { id: 'acceptance-acts', label: 'Эрх бүхий байгууллагуудаас гүйцэтгэсэн ажлыг нь хүлээж авсан актын хуулбар' },
    { id: 'audit-report', label: 'Хуваарьт болон хуваарьт бус аудитын дүгнэлт, зөвлөмжийн дагуу хэрэгжүүлсэн арга хэмжээний тайлан' },
    { id: 'boh3-form', label: 'БОХ-3 маягт. Уул уурхайн олборлолтын улмаас эвдэрсэн газрын нөхөн сэргээлтийн жилийн мэдээ' },
    { id: 'exploration-acceptance', label: 'Хайгуулын ажил, ТЭЗҮ-г хүлээн авсан тушаал, тэмдэглэл' },
    { id: 'bomt-checklist', label: 'БОМТ-ний биелэлтийн тайлан хүлээн авах хяналтын хуудас' },
    { id: 'liability-insurance', label: 'Байгууллагын хариуцлагын даатгалын хуулбар' },
    { id: 'resource-fee-receipt', label: 'Нөөц ашигласны төлбөр тушаасан баримтын хуулбар' },
    { id: 'resource-movement-report', label: 'Нөөцийн хөдөлгөөний тайлангийн хуулбар' },
    { id: 'export-customs-info', label: 'Хилээр экспортод гаргасан бүтээгдэхүүний талаар гаалийн албанаас гаргасан мэдээ' },
  ],
  // д. Дэд бүтцийн төсөл
  'Дэд бүтэц, барилга, ШТС': [
    monitoringPhotos('байгаль орчны бүрдэл хэсгүүд тус бүр дээр '),
    LAB_RESULTS,
    MITIGATION_PHOTOS,
    {
      id: 'landscaping-photos',
      label: 'Орчны тохижилт, нөхөн сэргээлтийн хүрээнд хийсэн ажлыг нотлох гэрэл зураг',
      note: PER_WORK_NOTE,
    },
    {
      id: 'chemical-usage',
      label: 'Тухайн жилийн барилга угсралтын ажлын төлөвлөгөөнд үндэслэн зарцуулсан химийн хортой болон аюултай бодисын ашиглалтын дүн мэдээ',
    },
    HAZARDOUS_WASTE_PHOTOS,
    LOCAL_WASTE_AGREEMENT,
    ACCEPTANCE_ACTS,
  ],
  // в. Аялал жуулчлал, үйлчилгээний төсөл
  'Аялал жуулчлал, үйлчилгээ': [
    monitoringPhotos(''),
    LAB_RESULTS,
    MITIGATION_PHOTOS,
    {
      id: 'landscaping-photos',
      label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн гүйцэтгэлийг харуулсан гэрэл зураг',
      note: BEFORE_DURING_AFTER_NOTE,
    },
    LOCAL_WASTE_AGREEMENT,
    { id: 'water-supply-act', label: 'Ус хангамж, ариутгах татуургын байгууламжийг барьж байгуулсан далд ажлын акт' },
    ACCEPTANCE_ACTS,
  ],
  // г. Хөдөө аж ахуй, үйлдвэрлэлийн төсөл
  Үйлдвэрлэл: [
    monitoringPhotos(''),
    LAB_RESULTS,
    MITIGATION_PHOTOS,
    {
      id: 'landscaping-photos',
      label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн хүрээнд хийсэн ажлыг нотлох гэрэл зураг',
      note: PER_WORK_NOTE,
    },
    {
      id: 'chemical-usage',
      label: 'Тухайн жилийн бизнес төлөвлөгөөнд үндэслэн зарцуулсан химийн бордоо, ургамал хамгаалал, хортон шавьжтай тэмцэх, үйлдвэрлэлд ашиглах зориулалттай химийн хортой болон аюултай бодисын ашиглалтын дүн мэдээ',
    },
    HAZARDOUS_WASTE_PHOTOS,
    LOCAL_WASTE_AGREEMENT,
    ACCEPTANCE_ACTS,
  ],
};

// Журмын 3 дугаар хавсралтын А хэсэг: the plan of each category is made of
// these tables. The id after "plan-" names the table's template file in
// public/samples/<category folder>/ (lib/reports/samples.ts).
const PLAN_NEGATIVE_IMPACT: ReportMaterial = { id: 'plan-negative-impact', label: 'Сөрөг нөлөөллийг бууруулах арга хэмжээний төлөвлөгөө' };
const PLAN_HERITAGE: ReportMaterial = { id: 'plan-heritage', label: 'Түүх, соёлын өвийг хамгаалах арга хэмжээний төлөвлөгөө' };
const PLAN_RISK: ReportMaterial = { id: 'plan-risk', label: 'Осол, эрсдэлийн менежментийн төлөвлөгөө' };
const PLAN_WASTE: ReportMaterial = { id: 'plan-waste', label: 'Хог, хаягдлын менежментийн төлөвлөгөө' };
const PLAN_MONITORING: ReportMaterial = { id: 'plan-monitoring', label: 'Орчны хяналт шинжилгээний хөтөлбөр' };
const PLAN_MANAGEMENT: ReportMaterial = { id: 'plan-management', label: 'Удирдлага зохион байгуулалтын төлөвлөгөө' };
const PLAN_REPORTING: ReportMaterial = { id: 'plan-reporting', label: 'Нөлөөллийн бүсийн оршин суугчдад тайлагнах төлөвлөгөө' };

export const PLAN_MATERIALS: Record<string, ReportMaterial[]> = {
  'Уул уурхай, газрын тос': [
    PLAN_NEGATIVE_IMPACT,
    {
      id: 'plan-rehabilitation',
      label: 'Нөхөн сэргээлтийн төлөвлөгөө /техникийн нөхөн сэргээлт, биологийн нөхөн сэргээлт, татан буулгах, хаалтад бэлтгэх/',
    },
    { id: 'plan-biodiversity', label: 'Биологийн олон янз байдлыг дүйцүүлэн хамгаалах арга хэмжээний төлөвлөгөө' },
    { id: 'plan-resettlement', label: 'Нүүлгэн шилжүүлэх, нөхөн олговор олгох арга хэмжээний төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  'Дэд бүтэц, барилга, ШТС': [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, нөхөн сэргээлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  'Аялал жуулчлал, үйлчилгээ': [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
  Үйлдвэрлэл: [
    PLAN_NEGATIVE_IMPACT,
    { id: 'plan-landscaping', label: 'Орчны тохижилт, цэцэрлэгжүүлэлтийн төлөвлөгөө' },
    PLAN_HERITAGE,
    PLAN_RISK,
    PLAN_WASTE,
    PLAN_MONITORING,
    PLAN_MANAGEMENT,
    PLAN_REPORTING,
  ],
};

// Every plan and performance report starts with a short introduction of the project.
export const PROJECT_INTRO: ReportMaterial = { id: 'project-intro', label: 'Төслийн товч танилцуулга' };

const PLAN_REPORT_TYPE = 'Жилийн төлөвлөгөө';

export function materialsFor(
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
): ReportMaterial[] {
  if (!reportCategory) return [];
  const lists = reportType === PLAN_REPORT_TYPE ? PLAN_MATERIALS : REPORT_MATERIALS;
  const materials = lists[reportCategory];
  return materials ? [PROJECT_INTRO, ...materials] : [];
}

// Heading for the material list of a report type.
export function materialsTitle(reportType: string | null | undefined) {
  return reportType === PLAN_REPORT_TYPE ? 'Бичиг баримтын бүрдэл' : 'Тайлангийн хавсралтууд';
}

// Files saved under a document row the list no longer has (an older version
// of the plan list), so they stay visible on the report.
export function leftoverMaterialGroups(
  attachments: Attachment[],
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
) {
  const known = new Set(materialsFor(reportType, reportCategory).map((material) => material.id));
  const ids = [...new Set(attachments.map((file) => file.materialId).filter((id): id is string => !!id && !known.has(id)))];
  return ids.map((id, index) => ({
    material: { id, label: `Өмнөх хавсралт ${index + 1}` } as ReportMaterial,
    files: attachments.filter((file) => file.materialId === id),
  }));
}

// Files of each material of the report's category that has any, in list order.
export function groupMaterialAttachments(
  attachments: Attachment[],
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
) {
  return materialsFor(reportType, reportCategory)
    .map((material) => ({ material, files: attachments.filter((file) => file.materialId === material.id) }))
    .filter((group) => group.files.length > 0);
}
