import type { Attachment } from '@/lib/reports/attachments';

type CriterionLike = {
  id: string;
};

export function splitScoringAttachments(attachments: Attachment[], criteria: CriterionLike[]) {
  const criterionAttachments = attachments.reduce((acc: Record<string, Attachment[]>, file) => {
    if (!file.criterionId) return acc;
    acc[file.criterionId] = [...(acc[file.criterionId] || []), file];
    return acc;
  }, {});
  // Material files are listed under their own material, not with general files.
  const reportAttachments = attachments.filter((file) => !file.criterionId && !file.materialId);

  if (criteria.length > 0 && Object.keys(criterionAttachments).length === 0 && reportAttachments.length >= criteria.length) {
    return {
      criterionAttachments: reportAttachments.reduce((acc: Record<string, Attachment[]>, file, index) => {
        const criterion = criteria[Math.min(index, criteria.length - 1)];
        acc[criterion.id] = [...(acc[criterion.id] || []), file];
        return acc;
      }, {}),
      reportAttachments: [],
    };
  }

  return { criterionAttachments, reportAttachments };
}

// Subject keyword at the start of a plan criterion → the plan document row
// (lib/reports/materials.ts) whose files back that criterion. Checked in
// order, so "Орчны тохижилт, нөхөн сэргээлт…" is landscaping, not rehabilitation.
const PLAN_SUBJECTS: [keyword: string, material: string][] = [
  ['сөрөг нөлөөллийг', 'plan-negative-impact'],
  ['орчны тохижилт', 'plan-landscaping'],
  ['нөхөн сэргээлт', 'plan-rehabilitation'],
  ['биологийн олон янз', 'plan-biodiversity'],
  ['нүүлгэн шилжүүлэх', 'plan-resettlement'],
  ['түүх, соёлын', 'plan-heritage'],
  ['осол, эрсдэл', 'plan-risk'],
  ['хог, хаягдл', 'plan-waste'],
  ['орчны хяналт', 'plan-monitoring'],
  ['удирдлага зохион', 'plan-management'],
  ['тайлагнах', 'plan-reporting'],
];

export function planMaterialForCriterion(criterionName: string): string | null {
  const name = criterionName.toLowerCase();
  return PLAN_SUBJECTS.find(([keyword]) => name.includes(keyword))?.[1] ?? null;
}

// Files behind each row of the scoring sheet. A plan is scored on its plan
// sheet, and each criterion shows the files of the matching plan document row;
// a performance report shows the evidence uploaded per criterion.
export function scoringAttachmentsFor(
  attachments: Attachment[],
  criteria: (CriterionLike & { name: string; sheet?: string | null })[],
) {
  // Plans scored before they had their own sheet keep the performance layout.
  if (!criteria.some((criterion) => criterion.sheet === 'plan')) return splitScoringAttachments(attachments, criteria);
  const criterionAttachments: Record<string, Attachment[]> = {};
  for (const criterion of criteria) {
    const material = planMaterialForCriterion(criterion.name);
    const files = material ? attachments.filter((file) => file.materialId === material) : [];
    if (files.length) criterionAttachments[criterion.id] = files;
  }
  return { criterionAttachments, reportAttachments: attachments.filter((file) => !file.criterionId && !file.materialId) };
}
