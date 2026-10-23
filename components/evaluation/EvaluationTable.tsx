'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { HiDownload } from 'react-icons/hi';
import SignatureBadge from '@/components/signature/SignatureBadge';
import { downloadUrl, type Attachment } from '@/lib/reports/attachments';
import { toast } from '@/lib/toast';
import { offerUndo } from '@/lib/undo';

type Criterion = {
  id: string;
  name: string;
  maxScore: number;
  sortOrder: number;
};

type Props = {
  criteria: Criterion[];
  reportId: string;
  savedScores?: Record<string, string> | null;
  // Үндэслэл, тайлбар saved for each criterion.
  savedNotes?: Record<string, string> | null;
  savedComment?: string | null;
  // Signature verification metadata only — the raw numeric signature/PIN is
  // never sent to the frontend, not even for the person who signed it.
  locked?: boolean;
  signatureStatus?: string | null;
  signedAt?: string | null;
  signatureId?: string | null;
  // Sender-reported project info (set at submission, not here) — evaluators
  // only ever view it for context while scoring, never edit it.
  greenery?: { hasGreenery: boolean | null; treeCount: number | null; spentAmount: number | null } | null;
  redirectTo?: string;
  // Optional content rendered on the left of the action row (e.g. the staff
  // "return report" button), opposite the submit button.
  leftAction?: ReactNode;
  // Scores other staff already submitted — shown as extra read-only columns to
  // the right of the current user's input column, so the whole evaluation lives
  // in one table.
  otherEvaluations?: { evaluatorName: string; totalScore: number; scores: { criterionId: string; score: number }[] }[];
  // Label for the current user's input column (their own name). Falls back to a
  // generic header on pages where there is no single "self" evaluator.
  selfName?: string;
  criterionAttachments?: Record<string, Attachment[]>;
};

export default function EvaluationTable({ criteria, reportId, savedScores, savedNotes, savedComment, locked, signatureStatus, signedAt, signatureId, greenery, redirectTo, leftAction, otherEvaluations = [], selfName, criterionAttachments = {} }: Props) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    if (savedScores) return savedScores;
    const init: Record<string, string> = {};
    criteria.forEach((c) => { init[c.id] = ''; });
    return init;
  });
  const [notes, setNotes] = useState<Record<string, string>>(() => savedNotes || {});
  const [showNoteErrors, setShowNoteErrors] = useState(false);
  const [comment, setComment] = useState(savedComment || '');
  const [signature, setSignature] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);
  const totalScore = Object.values(scores).reduce((a, b) => a + (parseInt(b) || 0), 0);

  const handleScoreChange = (id: string, value: string, max: number) => {
    if (value === '') {
      setScores((prev) => ({ ...prev, [id]: '' }));
      return;
    }
    const num = parseInt(value);
    if (isNaN(num)) return;
    setScores((prev) => ({ ...prev, [id]: String(Math.min(Math.max(0, num), max)) }));
  };

  const missingNotes = criteria.filter((c) => !(notes[c.id] || '').trim());

  const handleSubmit = async () => {
    if (missingNotes.length > 0) {
      setShowNoteErrors(true);
      toast(`${missingNotes.length} шалгуурын үндэслэл, тайлбарыг бичнэ үү.`, 'error');
      document.getElementById(`note-${missingNotes[0].id}`)?.focus();
      return;
    }
    if (!/^\d+$/.test(signature.trim())) {
      toast('Тоон гарын үсгээ зөвхөн тоогоор оруулна уу.', 'error');
      return;
    }
    setSubmitting(true);
    const response = await fetch('/api/evaluations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, scores, notes, comment, signature, totalScore }),
    });
    setSubmitting(false);
    if (response.ok) {
      const body = await response.json().catch(() => null);
      // Undo brings the member back to this form to score again.
      const formPath = `${window.location.pathname}${window.location.search}`;
      offerUndo('Үнэлгээ амжилттай өгөгдлөө.', body?.undoToken, () => {
        router.push(formPath);
        router.refresh();
      });
      router.push(redirectTo || '/reviewer/reports');
    } else {
      const body = await response.json().catch(() => null);
      toast(body?.error || 'Алдаа гарлаа. Дахин оролдоно уу.', 'error');
    }
  };

  const isDone = (id: string) => scores[id] !== '' && scores[id] != null && !!(notes[id] || '').trim();
  const doneCount = criteria.filter((c) => isDone(c.id)).length;

  return (
    <div className="border border-slate-200 bg-white">
      {/* Header: running total and how many rows are complete */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 px-6 py-5">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Дүгнэх хуудас</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            {locked ? 'Гарын үсгээр баталгаажсан үнэлгээ.' : 'Шалгуур бүрт оноо өгч, үндэслэлээ бичнэ үү.'}
          </p>
        </div>
        <div className="flex items-end gap-6">
          {!locked && (
            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Бөглөсөн</p>
              <p className="text-sm font-semibold text-slate-700">
                {doneCount} / {criteria.length}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Нийт оноо</p>
            <p className="text-2xl font-bold leading-none text-color-primary">
              {totalScore}
              <span className="text-base font-semibold text-slate-400"> / {maxTotal}</span>
            </p>
          </div>
        </div>
      </div>
      {!locked && (
        <div className="h-1 bg-slate-100">
          <div className="h-full bg-teal-600 transition-all" style={{ width: `${criteria.length ? (doneCount / criteria.length) * 100 : 0}%` }} />
        </div>
      )}

      {/* One card per criterion */}
      <ol className="divide-y divide-slate-200">
        {criteria.map((criterion, index) => {
          const files = criterionAttachments[criterion.id] || [];
          const done = isDone(criterion.id);
          const noteMissing = showNoteErrors && !(notes[criterion.id] || '').trim();
          return (
            <li key={criterion.id} className="grid grid-cols-1 gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_380px]">
              <div className="flex min-w-0 gap-4">
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    done || locked ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-slate-900">{criterion.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Авбал зохих оноо: <span className="font-semibold text-slate-700">{criterion.maxScore}</span>
                  </p>

                  <div className="mt-3">
                    <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">Илгээсэн файл</p>
                    {files.length === 0 ? (
                      <p className="text-xs text-slate-400">Файл хавсаргаагүй</p>
                    ) : (
                      <ul className="flex flex-wrap gap-2">
                        {files.map((file, fileIndex) => (
                          <li key={`${file.url}-${fileIndex}`} className="flex max-w-full items-stretch border border-slate-200 bg-slate-50 text-xs">
                            <a
                              href={file.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={file.name}
                              className="flex min-w-0 items-center gap-2 px-2.5 py-1.5 text-slate-700 hover:bg-teal-50 hover:text-teal-800"
                            >
                              <span className="shrink-0 bg-white px-1 py-0.5 text-[10px] font-bold uppercase text-slate-500 ring-1 ring-slate-200">
                                {(file.name.split('.').pop() || 'file').slice(0, 4)}
                              </span>
                              <span className="max-w-[220px] truncate font-medium">{file.name}</span>
                            </a>
                            <a
                              href={downloadUrl(file)}
                              className="flex items-center border-l border-slate-200 px-2 text-slate-500 hover:bg-teal-50 hover:text-teal-700"
                              aria-label={`${file.name} татах`}
                              title="Татах"
                            >
                              <HiDownload size={14} />
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {otherEvaluations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {otherEvaluations.map((ev, i) => {
                        const other = ev.scores.find((x) => x.criterionId === criterion.id);
                        return (
                          <span key={i} className="bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
                            {ev.evaluatorName}: <span className="font-semibold text-slate-800">{other ? other.score : '-'}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="min-w-0 space-y-2.5">
                <div className="flex items-center gap-3">
                  <label htmlFor={`score-${criterion.id}`} className="text-[11px] font-semibold uppercase tracking-wide text-color-primary">
                    {selfName || 'Өгөх оноо'}
                  </label>
                  <div className="ml-auto flex items-center border border-slate-300 bg-white focus-within:border-color-primary focus-within:ring-2 focus-within:ring-color-primary/10">
                    <input
                      id={`score-${criterion.id}`}
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={criterion.maxScore}
                      value={scores[criterion.id]}
                      placeholder="–"
                      disabled={locked}
                      onChange={(e) => handleScoreChange(criterion.id, e.target.value, criterion.maxScore)}
                      className="h-10 w-16 bg-transparent text-center text-base font-semibold text-slate-900 [appearance:textfield] focus:outline-none disabled:text-slate-500 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="border-l border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-500">/ {criterion.maxScore}</span>
                  </div>
                </div>
                {locked ? (
                  <div className="border-l-2 border-teal-500 bg-slate-50 px-3 py-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">Үндэслэл, тайлбар</p>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{notes[criterion.id] || '-'}</p>
                  </div>
                ) : (
                  <div>
                    <textarea
                      id={`note-${criterion.id}`}
                      value={notes[criterion.id] || ''}
                      onChange={(e) => setNotes((prev) => ({ ...prev, [criterion.id]: e.target.value }))}
                      placeholder="Үндэслэл, тайлбар *"
                      rows={3}
                      aria-label={`${criterion.name} — үндэслэл, тайлбар`}
                      className={`w-full resize-y border bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                        noteMissing ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-300 focus:border-color-primary focus:ring-color-primary/10'
                      }`}
                    />
                    {noteMissing && <p className="mt-1 text-xs text-rose-600">Үндэслэлээ бичнэ үү.</p>}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {/* Totals of every evaluator on the sheet */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-slate-200 bg-slate-50 px-6 py-4">
        <p className="text-sm font-bold text-slate-900">Нийт оноо</p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {otherEvaluations.map((ev, i) => (
            <span key={i} className="text-slate-500">
              {ev.evaluatorName}: <span className="font-semibold text-slate-700">{ev.totalScore}</span>
            </span>
          ))}
          <span className="font-bold text-color-primary">
            {selfName || 'Таны оноо'}: {totalScore} / {maxTotal}
          </span>
        </div>
      </div>

      <div className="px-6 pb-6">
        {/* Sender-reported project info — read-only, set at submission time. */}
        {greenery && greenery.hasGreenery != null && (
          <div className="mt-6 border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Ногоон байгууламж</h3>
            <div className="flex flex-wrap gap-x-8 gap-y-1.5 text-sm">
              <p><span className="text-slate-500">Ногоон байгууламжтай эсэх:</span> <span className="font-medium text-slate-800">{greenery.hasGreenery ? 'Тийм' : 'Үгүй'}</span></p>
              {greenery.hasGreenery && greenery.treeCount != null && (
                <p><span className="text-slate-500">Тарьсан мод:</span> <span className="font-medium text-slate-800">{greenery.treeCount}</span></p>
              )}
              {greenery.spentAmount != null && (
                <p><span className="text-slate-500">Зарцуулсан дүн:</span> <span className="font-medium text-slate-800">{greenery.spentAmount.toLocaleString()}₮</span></p>
              )}
            </div>
          </div>
        )}

        {/* Comment */}
        <div className="mt-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Сэтгэгдэл</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Үнэлгээний сэтгэгдэл бичнэ үү..."
            rows={3}
            disabled={locked}
            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y disabled:bg-slate-100 disabled:text-slate-500"
          />
        </div>

        {locked && (
          <div className="mt-6 flex items-center justify-between border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <p className="text-sm text-emerald-700">Гарын үсгээр баталгаажсан тул засах боломжгүй.</p>
            <SignatureBadge
              status={signatureStatus || 'VERIFIED'}
              signedAt={signedAt}
              signatureId={signatureId}
              signerName={selfName || ''}
              viewerRole="staff"
            />
          </div>
        )}

        {/* Digital (numeric) signature — the evaluator signs off on their scoring */}
        {!locked && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Тоон гарын үсэг <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={signature}
              onChange={(e) => setSignature(e.target.value.replace(/\D/g, ''))}
              placeholder="Тоон гарын үсгээ оруулна уу"
              className="w-full max-w-xs border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
            />
          </div>
        )}

        {/* Actions */}
        <div className={`mt-6 flex flex-col-reverse gap-4 sm:flex-row sm:items-start ${leftAction ? 'sm:justify-between' : 'sm:justify-end'}`}>
          {leftAction}
          {!locked && (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-10 px-6 bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center justify-center disabled:opacity-50"
            >
              {submitting ? 'Илгээж байна...' : 'Гарын үсэг зурж илгээх'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
