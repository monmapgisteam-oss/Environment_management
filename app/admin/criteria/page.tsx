import dataStore from '@/lib/db';

async function fetchCriteria() {
  return dataStore.evaluationCriterion.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export default async function AdminCriteriaPage() {
  const criteria = await fetchCriteria();
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  return (
    <main className="flex-1 min-w-0 space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl">Үнэлгээний шалгуур</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Хянах ажилтны тайлан үнэлэхэд ашигладаг шалгуурууд
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-12">№</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Шалгуур</th>
                <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase w-40">Авбал зохих оноо</th>
              </tr>
            </thead>
            <tbody>
              {criteria.map((c, index) => (
                <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 px-4 text-slate-600">{index + 1}</td>
                  <td className="py-3 px-4 text-slate-800">{c.name}</td>
                  <td className="py-3 px-4 text-center font-semibold text-slate-700">{c.maxScore}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-300 bg-slate-50">
                <td className="py-3 px-4"></td>
                <td className="py-3 px-4 font-bold text-slate-900">Нийт оноо</td>
                <td className="py-3 px-4 text-center font-bold text-slate-900">{maxTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
