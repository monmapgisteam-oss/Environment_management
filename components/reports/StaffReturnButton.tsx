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
        toast(data.error || 'Хүсэлт илгээхэд алдаа гарлаа.', 'error');
        return false;
      }
      offerUndo('Буцаах хүсэлт менежерт илгээгдлээ.', data.undoToken, () => {
        router.push(`/evaluator/evaluate/${reportId}`);
        router.refresh();
      });
      router.push('/evaluator');
      router.refresh();
      return true;
    } catch {
      toast('Хүсэлт илгээхэд алдаа гарлаа.', 'error');
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
          title="Тайланг буцаах хүсэлт"
          description="Буруу эсвэл дутуу хэсгүүдийг сонгоод тус бүрт тайлбар бичнэ үү. Менежер шалгаад илгээгч рүү буцаана; илгээгч зөвхөн эдгээр хэсгийг засна."
          sections={sections}
          submitLabel="Хүсэлт илгээх"
          onSubmit={submit}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
