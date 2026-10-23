'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReturnDialog from '@/components/reports/revision/ReturnDialog';
import RevisionItemList from '@/components/reports/revision/RevisionItemList';
import type { SignedReportSection } from '@/lib/reports/reportSections';
import type { RevisionItem } from '@/lib/reports/revisions';
import { toast } from '@/lib/toast';
import { offerUndo } from '@/lib/undo';

type Props = {
  reportId: string;
  status: string;
  // Reason + author of a staff member's return request, if one is pending.
  returnReason?: string | null;
  returnRequestedBy?: string | null;
  // Sections flagged by the staff request, or by the manager once returned.
  revisionItems: RevisionItem[];
  sections: SignedReportSection[];
};

// Manager-side controls on the report detail page. If a staff member requested a
// return, the manager sees which sections they flagged and can send the report
// back to the sender (adjusting the sections first) or dismiss the request. The
// manager can also return any report to the sender directly.
export default function ManagerReturnPanel({ reportId, status, returnReason, returnRequestedBy, revisionItems, sections }: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Once returned to the sender there is nothing more to do here.
  if (status === 'needs_revision') {
    return (
      <div className="border border-orange-200 bg-orange-50/40 p-5">
        <p className="text-sm font-semibold text-orange-700">Энэ тайлан илгээгч байгууллага руу буцаагдсан.</p>
        {returnReason && <p className="mt-1 text-sm text-slate-600">Шалтгаан: {returnReason}</p>}
        <RevisionItemList items={revisionItems} className="mt-3" />
      </div>
    );
  }

  const requested = status === 'return_requested';

  const post = async (url: string, body: Record<string, unknown>, doneMessage: string) => {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast(data.error || 'Алдаа гарлаа.', 'error');
      return false;
    }
    router.refresh();
    offerUndo(doneMessage, data.undoToken, () => router.refresh());
    return true;
  };

  const returnToSender = (reason: string, items: { key: string; comment: string }[]) =>
    post('/api/reports/return-to-sender', { reportId, reason, items }, 'Тайланг илгээгч рүү буцаалаа.').catch(() => {
      toast('Алдаа гарлаа.', 'error');
      return false;
    });

  const dismiss = async () => {
    setSaving(true);
    try {
      await post('/api/reports/return-dismiss', { reportId }, 'Буцаах хүсэлтийг цуцаллаа.');
    } catch {
      toast('Алдаа гарлаа.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`border bg-white p-5 ${requested ? 'border-purple-200' : 'border-slate-200'}`}>
      {requested ? (
        <div className="mb-4">
          <p className="text-sm font-semibold text-purple-800">
            Ажилтан буцаахыг хүссэн{returnRequestedBy ? ` (${returnRequestedBy})` : ''}
          </p>
          {returnReason && <p className="mt-1 text-sm text-purple-900/80">Тайлбар: {returnReason}</p>}
          <RevisionItemList items={revisionItems} className="mt-3" />
        </div>
      ) : (
        <>
          <h2 className="text-sm font-semibold text-slate-900">Тайланг илгээгч рүү буцаах</h2>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            Буруу хэсгүүдийг сонгож тус бүрт тайлбар бичнэ. Илгээгч зөвхөн тэдгээрийг засна.
          </p>
        </>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          disabled={saving}
          className="h-10 bg-orange-600 px-4 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-50"
        >
          {requested ? 'Шалгаад илгээгч рүү буцаах' : 'Илгээгч рүү буцаах'}
        </button>
        {requested && (
          <button
            type="button"
            onClick={dismiss}
            disabled={saving}
            className="h-10 border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {saving ? 'Хадгалж байна...' : 'Хүсэлтийг татгалзах'}
          </button>
        )}
      </div>

      {dialogOpen && (
        <ReturnDialog
          title="Илгээгч рүү буцаах"
          description={
            requested
              ? 'Ажилтны сонгосон хэсгүүдийг шалгаж, шаардлагатай бол засаад илгээгч рүү буцаана уу.'
              : 'Илгээгчийн засах ёстой хэсгүүдийг сонгоод тус бүрт тайлбар бичнэ үү.'
          }
          sections={sections}
          initialItems={requested ? revisionItems : []}
          initialReason={requested ? returnReason || '' : ''}
          submitLabel="Илгээгч рүү буцаах"
          onSubmit={returnToSender}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </div>
  );
}
