type Props = {
  reportId: string;
  isStaff: boolean;
};

// Link to the printable report cover page for managers and staff.
export default function ReportCoverLink({ reportId, isStaff }: Props) {
  const coverHref = `/report/${reportId}/cover?role=${isStaff ? 'staff' : 'reviewer'}`;

  return (
    <a
      href={coverHref}
      className="flex h-10 items-center justify-center bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
    >
      Тайлангийн нүүр хэвлэх
    </a>
  );
}
