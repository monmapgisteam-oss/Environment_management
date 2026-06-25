import { STATUS_LABELS, STATUS_BADGE_COLORS } from './constants';

export function getStatusBadgeClass(status: string) {
  return STATUS_BADGE_COLORS[status] || 'badge-gray';
}

export function getStatusLabel(status: string) {
  return STATUS_LABELS[status] || status;
}

export function formatDate(dateString?: string | Date | null) {
  if (!dateString) return '-';
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();
  return `${y} оны ${m}-р сарын ${d}`;
}
