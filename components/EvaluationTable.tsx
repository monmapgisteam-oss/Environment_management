'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

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
  redirectTo?: string;
};

export default function EvaluationTable({ criteria, reportId, savedScores, savedComment, redirectTo }: Props) {
  const [scores, setScores] = useState<Record<string, string>>(() => {
    if (savedScores) return savedScores;
    const init: Record<string, string> = {};
    criteria.forEach((c) => { init[c.id] = ''; });
    return init;
  });
  const [comment, setComment] = useState(savedComment || '');
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
    setSubmitting(true);
    const response = await fetch('/api/evaluations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportId, scores, comment, totalScore }),
    });
    setSubmitting(false);
    if (response.ok) {
      alert('Үнэлгээ амжилттай өгөгдлөө.');
      router.push(redirectTo || '/reviewer/reports');
    } else {
      alert('Алдаа гарлаа. Дахин оролдоно уу.');
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-900 mb-5">
        Тухайн жилийн байгаль орчны менежментийн төлөвлөгөөний бүрэлдэхүүн хэсгүүд
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-slate-200 bg-slate-50">
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
              <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-32">Авбал зохих оноо</th>
              <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-32">Өгөх оноо</th>
            </tr>
          </thead>
          <tbody>
            {criteria.map((criterion, index) => (
              <tr key={criterion.id} className="border-b border-slate-100 hover:bg-slate-50">
                <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                <td className="py-3 px-4 text-slate-800">{criterion.name}</td>
                <td className="py-3 px-4 text-center font-semibold text-slate-700">{criterion.maxScore}</td>
                <td className="py-3 px-4 text-center">
                  <input
                    type="number"
                    min={0}
                    max={criterion.maxScore}
                    value={scores[criterion.id]}
                    placeholder="-"
                    onChange={(e) => handleScoreChange(criterion.id, e.target.value, criterion.maxScore)}
                    className="w-20 h-9 rounded-lg border border-slate-200 text-center text-sm font-medium text-slate-800 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10"
                  />
                </td>
              </tr>
            ))}
            {/* Total */}
            <tr className="border-t-2 border-slate-300 bg-slate-50">
              <td className="py-3 px-4"></td>
              <td className="py-3 px-4 font-bold text-slate-900">Нийт оноо</td>
              <td className="py-3 px-4 text-center font-bold text-slate-900">{maxTotal}</td>
              <td className="py-3 px-4 text-center font-bold text-color-primary text-lg">{totalScore}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Comment */}
      <div className="mt-6">
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Сэтгэгдэл</label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Үнэлгээний сэтгэгдэл бичнэ үү..."
          rows={3}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y"
        />
      </div>

      {/* Actions */}
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="h-10 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center disabled:opacity-50"
        >
          {submitting ? 'Илгээж байна...' : 'Үнэлгээ өгөх'}
        </button>
      </div>
    </div>
  );
}
