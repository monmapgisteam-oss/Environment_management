import RevisionItemList from '@/components/reports/revision/RevisionItemList';
import type { RevisionItem } from '@/lib/reports/revisions';

type Props = {
  reason: string | null;
  items: RevisionItem[];
  fixHref: string;
};

// Tells the sender why the manager returned the report and which upload
// sections to fix.
export default function RevisionNotice({ reason, items, fixHref }: Props) {
  return (
    <div className="border border-orange-200 bg-orange-50/40 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-semibold text-orange-700">Тайлан засвар шаардсан байна</p>
        <a href={fixHref} className="inline-flex h-9 items-center bg-amber-500 px-4 text-sm font-semibold text-white transition hover:bg-amber-600">
          Засаад дахин илгээх
        </a>
      </div>
      {reason && <p className="mt-1 text-sm text-slate-700">Шалтгаан: {reason}</p>}
      {items.length > 0 && (
        <>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Засах хэсгүүд ({items.length})</p>
          <RevisionItemList items={items} className="mt-2" />
        </>
      )}
    </div>
  );
}
