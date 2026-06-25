'use client';

import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

type Criterion = {
  id: string;
  name: string;
  maxScore: number;
};

export default function EvaluatePage() {
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<{ [key: string]: number }>({});
  const [comment, setComment] = useState('');

  useEffect(() => {
    fetch('/api/criteria').then((res) => res.json()).then((data) => {
      setCriteria(data);
      const initialScores: { [key: string]: number } = {};
      data.forEach((c: Criterion) => {
        initialScores[c.id] = 0;
      });
      setScores(initialScores);
    });
  }, []);

  const handleScoreChange = (criterionId: string, value: number) => {
    setScores((prev) => ({ ...prev, [criterionId]: value }));
  };

  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  const maxScore = criteria.reduce((a, c) => a + c.maxScore, 0);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const response = await fetch('/api/evaluations/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scores, comment, totalScore }),
    });
    if (response.ok) {
      alert('Үнэлгээ амжилттай өгөгдлөө.');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header userName="Үнэлэгч" companyName="Хянах байгууллага" unreadCount={0} />
      <div className="flex">
        <Sidebar
          items={[
            { label: 'Удирдлагын хуудас', href: '/evaluator' },
            { label: 'Надад оноогдсон тайлангууд', href: '/evaluator' },
            { label: 'Тайлан дүгнэх', href: '/evaluator/evaluate', active: true },
          ]}
        />

        <main className="w-full p-6 lg:pl-0">
          <div className="max-w-2xl rounded-3xl bg-white p-8 shadow-soft border border-sky-100">
            <h1 className="mb-2 text-2xl font-semibold text-navy">Тайлан үнэлэх</h1>
            <p className="mb-6 text-sm text-slate-600">Шалгуур тус бүр дээр оноо өгнө үү.</p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                {criteria.map((criterion) => (
                  <div key={criterion.id} className="border-b border-sky-100 pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-3">
                      <label className="text-sm font-semibold text-slate-700">{criterion.name}</label>
                      <span className="text-xs text-slate-500">Макс: {criterion.maxScore} оноо</span>
                    </div>
                    <input
                      type="number"
                      min="0"
                      max={criterion.maxScore}
                      value={scores[criterion.id] || 0}
                      onChange={(e) => handleScoreChange(criterion.id, parseInt(e.target.value) || 0)}
                      className="w-full rounded-3xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-700"
                    />
                  </div>
                ))}
              </div>

              <div className="bg-sky-50 rounded-3xl p-4 text-center">
                <p className="text-sm text-slate-600">Нийт оноо</p>
                <p className="text-3xl font-semibold text-navy">{totalScore} / {maxScore}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Сэтгэгдэл</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Үнэлгээний сэтгэгдэл"
                  rows={4}
                  className="w-full rounded-3xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-700"
                />
              </div>

              <div className="flex gap-3 pt-6">
                <button type="submit" className="flex-1 rounded-full bg-primary px-6 py-3 font-semibold text-white hover:bg-[#0c3f6b]">
                  Үнэлгээ өгөх
                </button>
                <button type="button" onClick={() => history.back()} className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50">
                  Буцах
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
