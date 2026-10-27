import { HiKey } from 'react-icons/hi';

type Props = {
  reportId: string;
  isStaff: boolean;
};

// Opens the report cover, where managers and staff sign it with their digital
// signature password and print it.
export default function ReportCoverLink({ reportId, isStaff }: Props) {
  const coverHref = `/report/${reportId}/cover?role=${isStaff ? 'staff' : 'reviewer'}`;

  return (
    <a
      href={coverHref}
      className="flex h-10 items-center justify-center gap-2 bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
    >
      <HiKey size={16} />
      Гарын үсгээр баталгаажуулах
    </a>
  );
}
