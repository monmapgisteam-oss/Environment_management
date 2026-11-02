'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReturnDialog from '@/components/reports/revision/ReturnDialog';
import type { SignedReportSection } from '@/lib/reports/reportSections';
import { toast } from '@/lib/toast';
import { offerUndo } from '@/lib/undo';

// Lets a staff member flag an assigned report as incomplete and ask the manager
// to return it to the sender. The staff member ticks the upload sections that
// are wrong and comments on each; the manager reviews that before returning.
export default function StaffReturnButton({ reportId, sections }: { reportId: string; sections: SignedReportSection[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const submit = async (reason: string, items: { key: string; comment: string }[]) => {
    try {
      const res = await fetch('/api/reports/return-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, reason, items }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Буцаахад алдаа гарлаа.', 'error');
        return false;
      }
      if (data.warning) toast(data.warning, 'error');
      offerUndo('Илгээгчид засуулахаар буцаалаа.', data.undoToken, () => {
        router.push(`/evaluator/evaluate/${reportId}`);
        router.refresh();
      });
      router.push('/evaluator');
      router.refresh();
      return true;
    } catch {
      toast('Буцаахад алдаа гарлаа.', 'error');
      return false;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 border border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition inline-flex items-center"
      >
        Тайланг буцаах
      </button>

      {open && (
        <ReturnDialog
          title="Илгээгчид буцаах"
          description="Шаардлага хангаагүй шалгууруудыг сонгоод тус бүрт тайлбар бичнэ үү. Илгээгч эдгээр тайлбарын дагуу тайлан, хавсралтаа засаж дахин илгээнэ."
          sections={sections}
          submitLabel="Илгээгчид буцаах"
          onSubmit={submit}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
