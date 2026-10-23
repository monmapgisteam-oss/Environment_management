import type { RevisionItem } from '@/lib/reports/revisions';

// The flagged upload sections with the reviewer's comment on each.
export default function RevisionItemList({ items, className = '' }: { items: RevisionItem[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <ol className={`space-y-2 ${className}`}>
      {items.map((item, index) => (
        <li key={item.key} className="border-l-2 border-orange-400 bg-white px-3 py-2">
          <p className="text-xs font-semibold text-slate-800">
            {index + 1}. {item.label}
          </p>
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{item.comment}</p>
        </li>
      ))}
    </ol>
  );
}
