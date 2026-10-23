'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { toast } from '@/lib/toast';
import { offerUndo } from '@/lib/undo';
import DateInput from '@/components/ui/DateInput';

export type AssignStaffOption = { id: string; name: string; position: string | null };
export type AssignTarget = { id: string; reportNumber: string; title: string };

type Props = {
  report: AssignTarget;
  staff: AssignStaffOption[];
  // Members already assigned; they start ticked.
  assigneeIds: string[];
  onClose: () => void;
};

// Modal that distributes one report to staff members. Used on the assign page
// and from any "Гишүүдэд оноох" button, so the manager stays where they are.
// It renders into <body> so a sticky side column cannot keep it under the header.
export default function AssignDialog({ report, staff, assigneeIds, onClose }: Props) {
  const router = useRouter();
  // Only members still in the (active) staff list can stay ticked.
  const [selected, setSelected] = useState<string[]>(() => assigneeIds.filter((id) => staff.some((member) => member.id === id)));
  const [deadline, setDeadline] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const submit = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const res = await fetch('/api/assignments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId: report.id, evaluators: Array.from(new Set(selected)), deadline: deadline || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        onClose();
        router.refresh();
        offerUndo(`${report.reportNumber} тайланг гишүүдэд оноолоо.`, data.undoToken, () => router.refresh());
      } else {
        toast(data.error || 'Оноолт амжилтгүй боллоо.', 'error');
      }
    } catch {
      toast('Оноолт амжилтгүй боллоо.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="assign-dialog-title"
        className="w-full max-w-md bg-white p-6 text-left shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id="assign-dialog-title" className="text-lg font-semibold text-slate-900">Гишүүдэд оноох</h3>
        <p className="mt-1 text-sm text-slate-500">
          <span className="font-medium text-slate-700">{report.reportNumber}</span> — {report.title}
        </p>

        <div className="mt-4 max-h-64 space-y-2 overflow-y-auto">
          {staff.length === 0 && <p className="text-sm text-slate-400">Бүртгэлтэй гишүүн алга байна.</p>}
          {staff.map((member) => (
            <label key={member.id} className="flex cursor-pointer items-center gap-3 border border-slate-200 p-3 hover:bg-slate-50">
              <input
                type="checkbox"
                checked={selected.includes(member.id)}
                onChange={() => toggle(member.id)}
                className="h-4 w-4 accent-color-primary"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{member.name}</p>
                <p className="truncate text-xs text-slate-500">{member.position || 'Үнэлэгч'}</p>
              </div>
            </label>
          ))}
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium text-slate-700">Хүлээлгэх хугацаа (сонголттой)</label>
          <DateInput value={deadline} onChange={setDeadline} />
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={submit}
            disabled={saving || selected.length === 0}
            className="flex-1 bg-color-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-color-primary-dark disabled:opacity-50"
          >
            {saving ? 'Хадгалж байна...' : 'Оноох'}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            Цуцлах
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
