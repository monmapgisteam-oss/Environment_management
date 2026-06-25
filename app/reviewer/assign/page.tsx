'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

type User = {
  id: string;
  name: string;
  position: string;
};

function AssignEvaluatorsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const reportId = searchParams.get('reportId');

  const [evaluators, setEvaluators] = useState<User[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [deadline, setDeadline] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/users/evaluators').then((res) => res.json()).then((data) => {
      setEvaluators(data);
    });
  }, []);

  const handleToggle = (evaluatorId: string) => {
    setSelected((prev) =>
      prev.includes(evaluatorId) ? prev.filter((id) => id !== evaluatorId) : [...prev, evaluatorId],
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!reportId || selected.length === 0) {
      alert('Үнэлэгчийг сонгоно уу.');
      return;
    }
    setLoading(true);
    const response = await fetch('/api/assignments/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportId,
        evaluators: selected,
        deadline: deadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        assignedByUserId: 'current-user-id',
      }),
    });
    setLoading(false);
    if (response.ok) {
      alert('Үнэлэгчид оноогдлоо.');
      router.push('/reviewer');
    }
  };

  return (
    <div className="max-w-2xl rounded-3xl bg-white p-8 shadow-soft border border-sky-100">
      <h1 className="mb-2 text-2xl font-semibold text-navy">Үнэлэгчдэд оноох</h1>
      <p className="mb-6 text-sm text-slate-600">Тайлан үнэлэх үнэлэгчдийг сонгоно уу.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-3">Үнэлэгчид</label>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {evaluators.map((evaluator) => (
              <label key={evaluator.id} className="flex items-center gap-3 rounded-3xl border border-sky-100 p-4 cursor-pointer hover:bg-sky-50">
                <input
                  type="checkbox"
                  checked={selected.includes(evaluator.id)}
                  onChange={() => handleToggle(evaluator.id)}
                  className="w-5 h-5 rounded-full accent-primary"
                />
                <div>
                  <p className="font-semibold text-slate-800">{evaluator.name}</p>
                  <p className="text-sm text-slate-500">{evaluator.position}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Үнэлгээний хүлээлтийн огноо</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full rounded-3xl border border-sky-100 bg-slate-50 px-4 py-3 text-slate-700"
          />
        </div>

        <div className="flex gap-3 pt-6">
          <button
            type="submit"
            disabled={loading || selected.length === 0}
            className="flex-1 rounded-full bg-primary px-6 py-3 font-semibold text-white hover:bg-[#0c3f6b] disabled:opacity-50"
          >
            {loading ? 'Боловсруулж байна...' : 'Оноох'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-slate-200 bg-white px-6 py-3 font-semibold text-slate-700 hover:bg-slate-50"
          >
            Цуцлах
          </button>
        </div>
      </form>
    </div>
  );
}

export default function AssignEvaluatorsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header userName="Хянах менежер" companyName="Хянах байгууллага" unreadCount={0} />
      <div className="flex">
        <Sidebar items={[{ label: 'Буцах', href: '/reviewer' }]} />

        <main className="w-full p-6 lg:pl-0">
          <Suspense fallback={<div className="text-center py-8">Ачааж байна...</div>}>
            <AssignEvaluatorsContent />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
