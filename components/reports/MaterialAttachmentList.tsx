import AttachmentList from '@/components/reports/AttachmentList';
import type { Attachment } from '@/lib/reports/attachments';
import { groupMaterialAttachments } from '@/lib/reports/materials';

// Supporting materials the sender attached, one card per required item.
export default function MaterialAttachmentList({
  attachments,
  reportCategory,
}: {
  attachments: Attachment[];
  reportCategory: string | null;
}) {
  const groups = groupMaterialAttachments(attachments, reportCategory);
  if (groups.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-slate-900">Тайлангийн хавсралтууд</h2>
      {groups.map(({ material, files }) => (
        <AttachmentList key={material.id} attachments={files} title={material.label} />
      ))}
    </section>
  );
}
