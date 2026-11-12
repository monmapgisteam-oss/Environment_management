import { HiDocumentText } from 'react-icons/hi';

type Props = {
  reportId: string;
  isStaff: boolean;
};

// Opens the printable report cover. It only shows signatures already made
// (evaluators' scores, the manager's approval); nothing is signed there.
export default function ReportCoverLink({ reportId, isStaff }: Props) {
  const coverHref = `/report/${reportId}/cover?role=${isStaff ? 'staff' : 'reviewer'}`;

  return (
    <a
      href={coverHref}
      className="flex h-10 items-center justify-center gap-2 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
    >
      <HiDocumentText size={16} />
      Нүүр хуудас харах / хэвлэх
    </a>
  );
}
