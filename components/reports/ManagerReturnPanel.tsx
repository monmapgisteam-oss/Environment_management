'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  reportId: string;
  status: string;
  // Reason + author of a staff member's return request, if one is pending.
  returnReason?: string | null;
  returnRequestedBy?: string | null;
};

// Manager-side controls on the report detail page. If a staff member requested a
// return, the manager sees the reason and can either send the report back to the
// sender (confirm) or dismiss the request. The manager can also return any
// report to the sender directly.
export default function ManagerReturnPanel({ reportId, status, returnReason, returnRequestedBy }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState(returnReason || '');
  const [saving, setSaving] = useState(false);

  // Once returned to the sender there is nothing more to do here.
  if (status === 'needs_revision') {
    return (
      <div className="bg-white rounded-2xl border border-orange-200 p-6">
        <p className="text-sm font-semibold text-orange-700">Энэ тайлан илгээгч байгууллага руу буцаагдсан.</p>
        {returnReason && <p className="mt-1 text-sm text-slate-600">Шалтгаан: {returnReason}</p>}
      </div>
    );
  }

  const requested = status === 'return_requested';

  const call = async (url: string, body: Record<string, unknown>) => {
    setSaving(true);
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Алдаа гарлаа.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`bg-white rounded-2xl border p-6 ${requested ? 'border-purple-200' : 'border-slate-200'}`}>
      {requested && (
        <div className="mb-4 rounded-xl border border-purple-200 bg-purple-50 px-4 py-3">
          <p className="text-sm font-semibold text-purple-800">
            Үнэлгээний ажилтан тайланг буцаахыг хүссэн{returnRequestedBy ? ` (${returnRequestedBy})` : ''}
          </p>
          {returnReason && <p className="mt-1 text-sm text-purple-900/80">Шалтгаан: {returnReason}</p>}
        </div>
      )}

      <h2 className="text-base font-semibold text-slate-900 mb-2">Тайланг илгээгч рүү буцаах</h2>
      <p className="text-sm text-slate-500 mb-3">
        Шалгаад дутуу гэж үзвэл шалтгаанаа бичиж илгээгч байгууллага руу буцаана уу.
      </p>

      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Буцаах шалтгаан..."
        rows={3}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 resize-y"
      />

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={() => call('/api/reports/return-to-sender', { reportId, reason })}
          disabled={saving || !reason.trim()}
          className="rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
        >
          {saving ? 'Илгээж байна...' : 'Илгээгч рүү буцаах'}
        </button>
        {requested && (
          <button
            onClick={() => call('/api/reports/return-dismiss', { reportId })}
            disabled={saving}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
          >
            Хүсэлтийг татгалзах
          </button>
        )}
      </div>
    </div>
  );
}
