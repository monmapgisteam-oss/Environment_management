'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import SignatureBadge from '@/components/signature/SignatureBadge';
import { downloadUrl, type Attachment } from '@/lib/reports/attachments';

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

export default function EvaluationTable({ criteria, reportId, savedScores, savedComment, locked, signatureStatus, signedAt, signatureId, greenery, redirectTo, leftAction, otherEvaluations = [], selfName, criterionAttachments = {} }: Props) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    if (savedScores) return savedScores;
    const init: Record<string, string> = {};
    criteria.forEach((c) => { init[c.id] = ''; });
    return init;
  });
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

  const handleSubmit = async () => {
    if (!/^\d+$/.test(signature.trim())) {
      alert('Тоон гарын үсгээ зөвхөн тоогоор оруулна уу.');
      return;
    }
    setSubmitting(true);
    const response = await fetch('/api/evaluations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, scores, comment, signature, totalScore }),
    });
    setSubmitting(false);
    if (response.ok) {
      alert('Үнэлгээ амжилттай өгөгдлөө.');
      router.push(redirectTo || '/reviewer/reports');
    } else {
      const body = await response.json().catch(() => null);
      alert(body?.error || 'Алдаа гарлаа. Дахин оролдоно уу.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-5">
        Дүгнэх хуудас
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-32">Авбал зохих оноо</th>
              {otherEvaluations.map((ev, i) => (
                <th key={i} className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-28">{ev.evaluatorName}</th>
              ))}
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-56">Илгээсэн файл</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-color-primary uppercase w-32 bg-blue-50">{selfName || 'Өгөх оноо'}</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, index) => (
              <tr key={criterion.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                <td className="py-3 px-4 text-slate-800">{criterion.name}</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-700">{criterion.maxScore}</td>
                {otherEvaluations.map((ev, i) => {
                  const s = ev.scores.find((x) => x.criterionId === criterion.id);
                  return (
                    <td key={i} className="py-3 px-4 text-center font-medium text-slate-500">
                      {s ? s.score : '-'}
                    </td>
                  );
                })}
                <td className="py-3 px-4">
                  {(criterionAttachments[criterion.id] || []).length > 0 ? (
                    <div className="space-y-1.5">
                      {(criterionAttachments[criterion.id] || []).map((file, fileIndex) => (
                        <div key={`${file.url}-${fileIndex}`} className="flex items-center gap-2">
                          <span className="max-w-[130px] truncate text-xs text-slate-600">{file.name}</span>
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-color-primary hover:underline">
                            Нээх
                          </a>
                          <a href={downloadUrl(file)} className="text-xs font-semibold text-color-primary hover:underline">
                            Татах
                          </a>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-center bg-blue-50/40">
                  <input
                    type="number"
                    min={0}
                    max={criterion.maxScore}
                    value={scores[criterion.id]}
                    placeholder="-"
                    disabled={locked}
                    onChange={(e) => handleScoreChange(criterion.id, e.target.value, criterion.maxScore)}
                    className="w-20 h-9 rounded-lg border border-slate-200 text-center text-sm font-medium text-slate-800 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </td>
              </tr>
            ))}
            {/* Total */}
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 font-bold text-slate-900">Нийт оноо</td>
              <td className="py-3 px-4 text-center font-bold text-slate-900">{maxTotal}</td>
              {otherEvaluations.map((ev, i) => (
                <td key={i} className="py-3 px-4 text-center font-bold text-slate-600 text-lg">{ev.totalScore}</td>
              ))}
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 text-center font-bold text-color-primary text-lg bg-blue-50">{totalScore}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Sender-reported project info — read-only, set at submission time. */}
      {greenery && greenery.hasGreenery != null && (
        <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
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
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y disabled:bg-slate-100 disabled:text-slate-500"
        />
      </div>

      {locked && (
        <div className="mt-6 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-3">
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
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
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
            className="h-10 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center justify-center disabled:opacity-50"
          >
            {submitting ? 'Илгээж байна...' : 'Гарын үсэг зурж илгээх'}
          </button>
        )}
      </div>
    </div>
  );
}
