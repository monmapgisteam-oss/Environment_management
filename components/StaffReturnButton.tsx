'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

// Lets a staff member flag an assigned report as incomplete and ask the manager
// to return it to the sender. Shows a reason modal, then posts the request.
export default function StaffReturnButton({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!reason.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/reports/return-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, reason }),
      });
      if (res.ok) {
        setOpen(false);
        alert('Буцаах хүсэлт менежерт илгээгдлээ.');
        router.push('/evaluator');
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Хүсэлт илгээхэд алдаа гарлаа.');
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 px-5 rounded-xl border border-orange-300 bg-orange-50 text-sm font-semibold text-orange-700 hover:bg-orange-100 transition inline-flex items-center"
      >
        Тайланг буцаах
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900">Тайланг буцаах хүсэлт</h3>
            <p className="mt-1 text-sm text-slate-500">
              Тайлан дутуу гэж үзвэл шалтгаанаа бичиж менежерт илгээнэ үү. Менежер шалгаад илгээгч байгууллага руу буцаана.
            </p>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Шалтгаан</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Юу дутуу байгааг тодорхой бичнэ үү..."
                rows={4}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 resize-y"
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={submit}
                disabled={saving || !reason.trim()}
                className="flex-1 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-700 transition disabled:opacity-50"
              >
                {saving ? 'Илгээж байна...' : 'Хүсэлт илгээх'}
              </button>
              <button
                onClick={() => setOpen(false)}
                disabled={saving}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Цуцлах
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
