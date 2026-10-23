'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { HiOutlineSpeakerphone } from 'react-icons/hi';
import { confirmDialog } from '@/lib/confirm';
import { toast } from '@/lib/toast';
import {
  BROADCAST_AUDIENCES,
  BROADCAST_MESSAGE_MAX,
  BROADCAST_TITLE_MAX,
  audienceLabel,
  type BroadcastAudience,
} from '@/lib/notifications/broadcast';

const inputClass =
  'w-full border border-slate-300 bg-white px-3.5 text-sm text-slate-800 transition focus:border-teal-600 focus:outline-none focus:ring-4 focus:ring-teal-600/10';

// Compose a system message, pick who gets it, confirm with the recipient
// count, send. A preview shows how it will look in the bell.
export default function BroadcastForm({ counts }: { counts: Record<string, number> }) {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [audience, setAudience] = useState<BroadcastAudience>('all');
  const [sending, setSending] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const count = counts[audience] ?? 0;
    const ok = await confirmDialog({
      title: 'Мэдэгдэл илгээх',
      message: `"${title.trim()}" мэдэгдлийг ${audienceLabel(audience).toLowerCase()} — ${count} хэрэглэгчид илгээх үү? Илгээсний дараа буцаах боломжгүй.`,
      confirmLabel: 'Илгээх',
    });
    if (!ok) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, message, audience }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Мэдэгдэл илгээхэд алдаа гарлаа.', 'error');
        return;
      }
      toast(`Мэдэгдэл ${data.recipientCount} хэрэглэгчид илгээгдлээ.`);
      setTitle('');
      setMessage('');
      router.refresh();
    } catch {
      toast('Мэдэгдэл илгээхэд алдаа гарлаа.', 'error');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={submit} className="border border-slate-200 bg-white">
      <div className="space-y-5 px-6 py-5">
        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-slate-700">Хүлээн авагч</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {BROADCAST_AUDIENCES.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center justify-between gap-3 border px-3.5 py-2.5 text-sm transition ${
                  audience === option.value ? 'border-teal-600 bg-teal-50/60 text-teal-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name="audience"
                    value={option.value}
                    checked={audience === option.value}
                    onChange={() => setAudience(option.value)}
                    className="accent-teal-600"
                  />
                  {option.label}
                </span>
                <span className="shrink-0 text-xs text-slate-500">{counts[option.value] ?? 0} хүн</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="broadcast-title" className="mb-1 block text-[13px] font-medium text-slate-700">
            Гарчиг <span className="text-rose-500">*</span>
          </label>
          <input
            id="broadcast-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={BROADCAST_TITLE_MAX}
            required
            placeholder="ж: Биелэлтийн тайлан хүлээн авах хугацаа"
            className={`${inputClass} h-10`}
          />
        </div>

        <div>
          <div className="mb-1 flex items-baseline justify-between">
            <label htmlFor="broadcast-message" className="text-[13px] font-medium text-slate-700">
              Агуулга <span className="text-rose-500">*</span>
            </label>
            <span className="text-xs text-slate-400">
              {message.length} / {BROADCAST_MESSAGE_MAX}
            </span>
          </div>
          <textarea
            id="broadcast-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            maxLength={BROADCAST_MESSAGE_MAX}
            required
            rows={5}
            className={`${inputClass} resize-y py-2.5`}
          />
        </div>

        {(title.trim() || message.trim()) && (
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Хонхонд харагдах байдал</p>
            <div className="max-w-sm border border-slate-200 bg-blue-50/50 px-4 py-3">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-teal-700">
                <HiOutlineSpeakerphone size={13} /> Системийн мэдэгдэл
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{title.trim() || 'Гарчиг'}</p>
              <p className="mt-0.5 whitespace-pre-wrap text-xs text-slate-500">{message.trim() || 'Агуулга'}</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
        <p className="text-xs text-slate-500">
          {audienceLabel(audience)} · <span className="font-semibold text-slate-700">{counts[audience] ?? 0}</span> идэвхтэй хэрэглэгч
        </p>
        <button
          type="submit"
          disabled={sending || !title.trim() || !message.trim() || !(counts[audience] > 0)}
          className="inline-flex h-10 items-center gap-2 bg-[#0F766E] px-5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-50"
        >
          <HiOutlineSpeakerphone size={16} />
          {sending ? 'Илгээж байна...' : 'Илгээх'}
        </button>
      </div>
    </form>
  );
}
