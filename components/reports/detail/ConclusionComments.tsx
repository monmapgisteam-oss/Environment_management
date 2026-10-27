'use client';

import { useState, type FormEvent } from 'react';
import { HiOutlineChatAlt2 } from 'react-icons/hi';
import { toast } from '@/lib/toast';
import { COMMENT_MAX_LENGTH } from '@/lib/reports/reportComments';

export type ConclusionComment = {
  id: string;
  authorName: string;
  authorRole: 'admin' | 'review_manager';
  body: string;
  createdAt: string;
};

const ROLE_LABEL: Record<ConclusionComment['authorRole'], string> = {
  admin: 'Системийн админ',
  review_manager: 'Хянах менежер',
};

type Props = {
  reportId: string;
  initialComments: ConclusionComment[];
  // Admin and review managers write; the sender only reads.
  canComment: boolean;
};

// Comments on a company's general evaluation conclusion, oldest first.
export default function ConclusionComments({ reportId, initialComments, canComment }: Props) {
  const [comments, setComments] = useState(initialComments);
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!body.trim()) {
      setError('Тайлбараа бичнэ үү.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || 'Тайлбар хадгалахад алдаа гарлаа.');
        return;
      }
      setComments((current) => [...current, data.comment]);
      setBody('');
      toast('Тайлбар нэмэгдлээ. Илгээгч байгууллагад мэдэгдэл очлоо.');
    } catch {
      setError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setSaving(false);
    }
  };

  if (!canComment && comments.length === 0) return null;

  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-6 py-4">
        <HiOutlineChatAlt2 size={18} className="text-teal-700" />
        <h2 className="text-base font-semibold text-slate-900">Дүгнэлтийн тайлбар</h2>
        <span className="text-sm text-slate-400">{comments.length}</span>
      </div>

      {comments.length === 0 ? (
        <p className="px-6 py-6 text-sm text-slate-400">Тайлбар алга. Дүгнэлтийг шалгаад санал, тайлбараа үлдээнэ үү.</p>
      ) : (
        <ol className="divide-y divide-slate-100">
          {comments.map((comment) => (
            <li key={comment.id} className="flex gap-3 px-6 py-4">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center text-xs font-bold ${
                  comment.authorRole === 'admin' ? 'bg-slate-100 text-slate-600' : 'bg-violet-50 text-violet-700'
                }`}
              >
                {comment.authorName.trim().charAt(0).toUpperCase() || '?'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-slate-900">{comment.authorName}</span>
                  <span className="text-slate-400"> · {ROLE_LABEL[comment.authorRole]}</span>
                </p>
                <p className="text-xs text-slate-400">
                  {new Date(comment.createdAt).toLocaleString('mn-MN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">{comment.body}</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {canComment && (
        <form onSubmit={submit} className="border-t border-slate-200 bg-slate-50/60 px-6 py-4">
          <label htmlFor="conclusion-comment" className="sr-only">
            Тайлбар
          </label>
          <textarea
            id="conclusion-comment"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="Дүгнэлтийн талаарх санал, тайлбар..."
            className="w-full resize-y border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-2 focus:ring-teal-600/10"
          />
          {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-slate-400">Илгээгч байгууллага болон бусад хянагчид харж, мэдэгдэл авна.</p>
            <button
              type="submit"
              disabled={saving}
              className="h-9 shrink-0 bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:opacity-60"
            >
              {saving ? 'Илгээж байна...' : 'Тайлбар илгээх'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
