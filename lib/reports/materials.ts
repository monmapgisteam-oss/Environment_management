import type { Attachment } from '@/lib/reports/attachments';

// Documents a report must attach, per report type and category. A plan uses
// Журмын 5 дугаар хавсралтын А хэсэг (plus the attachments the mining checklist
// in Журмын 6 дугаар хавсралт asks for); a performance report uses
// "Тайлангийн хавсралтууд" from Журмын 3 дугаар хавсралтын Б хэсэг.
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

// Журмын 5 дугаар хавсралтын А хэсэг: documents needed to accept a plan.
// Item 6 asks for the plan itself (3 printed copies and an electronic copy).
const PLAN_COMPANY_CERTIFICATE: ReportMaterial = { id: 'plan-company-certificate', label: 'Аж ахуйн нэгжийн гэрчилгээ' };
const PLAN_LICENSE_COPY: ReportMaterial = {
  id: 'plan-license-copy',
  label: 'Тусгай зөвшөөрлийн хуулбар',
  note: 'Хуулиар тусгай зөвшөөрөл шаардлагатай үйл ажиллагааны хувьд',
};
const PLAN_CHECKLIST: ReportMaterial = {
  id: 'plan-checklist',
  label: 'Байгаль орчны менежментийн төлөвлөгөөний хяналтын хуудас',
  note: 'аж ахуйн нэгж бөглөх',
};
const PLAN_NO_OPERATION_STATEMENT: ReportMaterial = {
  id: 'plan-no-operation-statement',
  label: 'Энэ журмын 2.6-д заасан нөхцөл байдлын улмаас өмнөх онд ашиглалт хийгээгүй, үйл ажиллагаа явуулаагүй тухай тодорхойлолт',
  note: 'хамаарах тохиолдолд',
};
const PLAN_DOCUMENT: ReportMaterial = {
  id: 'plan-document',
  label: 'Тухайн жилийн байгаль орчны менежментийн төлөвлөгөө',
  note: 'цахим хэлбэрээр; хэвлэмэл хэлбэрээр 3 хувь ирүүлнэ',
};

const PLAN_COMMON_BEFORE: ReportMaterial[] = [PLAN_COMPANY_CERTIFICATE, PLAN_LICENSE_COPY, PLAN_CHECKLIST, PLAN_NO_OPERATION_STATEMENT];

export const PLAN_MATERIALS: Record<string, ReportMaterial[]> = {
  'Уул уурхай, газрын тос': [
    ...PLAN_COMMON_BEFORE,
    {
      id: 'plan-mining-work-plan',
      label: 'Тухайн жилийн уулын ажлын төлөвлөгөөний баталгаажсан нүүр, байгаль орчинтой холбоотой маягтууд',
      note: 'маягт 1.1, 2.1, 6.2, 7.1, 10 ...',
    },
    // Журмын 6 дугаар хавсралт, 2.1.9 and 2.1.11.
    {
      id: 'plan-mining-work-plan-forms',
      label: 'Батлагдсан уулын ажлын төлөвлөгөөний 1.1, 1.5, 1.7, 1.9, 1.10, 1.11 дэх маягт',
    },
    {
      id: 'plan-protected-area-reference',
      label: 'ТХГН, гол, мөрний урсац бүрэлдэх эх, усны сан бүхий газрын хамгаалалтын бүс, ойн сан бүхий газрын хилийн заагтай давхцсан эсэхийг тодорхойлсон лавлагаа',
    },
    PLAN_DOCUMENT,
  ],
  'Дэд бүтэц, барилга, ШТС': [...PLAN_COMMON_BEFORE, PLAN_DOCUMENT],
  'Аялал жуулчлал, үйлчилгээ': [...PLAN_COMMON_BEFORE, PLAN_DOCUMENT],
  Үйлдвэрлэл: [...PLAN_COMMON_BEFORE, PLAN_DOCUMENT],
};

const PLAN_REPORT_TYPE = 'Жилийн төлөвлөгөө';

export function materialsFor(
  reportType: string | null | undefined,
  reportCategory: string | null | undefined,
): ReportMaterial[] {
  if (!reportCategory) return [];
  const lists = reportType === PLAN_REPORT_TYPE ? PLAN_MATERIALS : REPORT_MATERIALS;
  return lists[reportCategory] || [];
}

// Heading for the material list of a report type.
export function materialsTitle(reportType: string | null | undefined) {
  return reportType === PLAN_REPORT_TYPE ? 'Бичиг баримтын бүрдэл' : 'Тайлангийн хавсралтууд';
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
