import { HiOutlineUserGroup } from 'react-icons/hi';
import AssignButton from '@/components/evaluation/AssignButton';
import type { AssignTarget } from '@/components/evaluation/AssignDialog';
import type { AssignedStaffMember } from './types';

type Props = {
  staff: AssignedStaffMember[];
  // Set while the report can still be distributed; shows the assign button.
  assignReport?: AssignTarget;
};

// Manager view of which staff the report was distributed to and who has scored
// it. Sits in the narrow side column, so members are listed one per row.
export default function AssignedStaffCard({ staff, assignReport }: Props) {
  const scored = staff.filter((member) => member.submitted).length;

  return (
    <div className="border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <HiOutlineUserGroup size={17} className="text-teal-700" />
          Оноогдсон гишүүд
        </h2>
        {staff.length > 0 && (
          <span className="text-xs text-slate-500">
            <span className="font-semibold text-slate-900">{scored}</span> / {staff.length} үнэлсэн
          </span>
        )}
      </div>
      {staff.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">Энэ тайлан одоогоор гишүүдэд оноогдоогүй байна.</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100">
          {staff.map((member, index) => (
            <li key={index} className="flex items-center gap-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-bold text-teal-700 ring-1 ring-teal-100">
                {member.name.charAt(0)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-900">{member.name}</span>
                <span className="block truncate text-xs text-slate-500">{member.position || 'Үнэлэгч'}</span>
              </span>
              <span
                className={`shrink-0 px-2 py-0.5 text-[11px] font-semibold ${
                  member.submitted ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                {member.submitted ? 'Үнэлсэн' : 'Хүлээгдэж буй'}
              </span>
            </li>
          ))}
        </ul>
      )}
      {assignReport && (
        <AssignButton
          report={assignReport}
          className="mt-4 flex h-10 w-full items-center justify-center border border-teal-600 bg-white px-4 text-sm font-semibold text-teal-700 transition hover:bg-teal-50"
        >
          {staff.length > 0 ? 'Дахин оноох' : 'Гишүүдэд оноох'}
        </AssignButton>
      )}
    </div>
  );
}
