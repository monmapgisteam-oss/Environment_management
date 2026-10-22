import type { AssignedStaffMember } from './types';

type Props = {
  staff: AssignedStaffMember[];
};

// Manager view of which staff the report was distributed to and who has scored it.
export default function AssignedStaffCard({ staff }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <h2 className="text-base font-semibold text-slate-900">
          Оноогдсон гишүүд <span className="font-normal text-slate-400">({staff.length})</span>
        </h2>
      </div>
      {staff.length === 0 ? (
        <p className="text-sm text-slate-500">Энэ тайлан одоогоор гишүүдэд оноогдоогүй байна.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {staff.map((member, index) => (
            <div key={index} className="flex items-center gap-3 rounded-xl border border-slate-200 p-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-color-primary text-sm font-bold text-white">
                {member.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-800 truncate">{member.name}-т оноогдсон</p>
                <p className="text-xs text-slate-500 truncate">{member.position || 'Үнэлэгч'}</p>
              </div>
              <span className={`shrink-0 px-2.5 py-1 text-xs font-medium ${member.submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                {member.submitted ? 'Үнэлсэн' : 'Хүлээгдэж буй'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
