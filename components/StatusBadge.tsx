import { getStatusBadgeClass, getStatusLabel } from '@/lib/utils';

type Props = {
  status: string;
  label?: string;
};

export default function StatusBadge({ status, label }: Props) {
  const displayLabel = label || getStatusLabel(status);
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(status)}`}>
      {displayLabel}
    </span>
  );
}
