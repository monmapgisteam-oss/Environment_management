import type { Attachment } from '@/lib/attachments';

type CriterionLike = {
  id: string;
};

export function splitScoringAttachments(attachments: Attachment[], criteria: CriterionLike[]) {
  const criterionAttachments = attachments.reduce((acc: Record<string, Attachment[]>, file) => {
    if (!file.criterionId) return acc;
    acc[file.criterionId] = [...(acc[file.criterionId] || []), file];
    return acc;
  }, {});
  const reportAttachments = attachments.filter((file) => !file.criterionId);

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
