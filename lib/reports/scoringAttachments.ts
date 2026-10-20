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
