// Page skeleton shown by every loading.tsx: title row, stat tiles and a table
// outline in the page's own layout, so the screen does not jump when data lands.
export default function LoadingSpinner() {
  return (
    <main className="flex-1 min-w-0 animate-pulse space-y-6 p-6" aria-busy="true" aria-label="Уншиж байна">
      <div className="space-y-2">
        <div className="h-7 w-64 bg-slate-200" />
        <div className="h-4 w-96 max-w-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="h-28 border border-slate-200 bg-white p-5">
            <div className="h-4 w-24 bg-slate-100" />
            <div className="mt-4 h-8 w-16 bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="border border-slate-200 bg-white">
        <div className="h-12 border-b border-slate-200 bg-slate-50" />
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-6 border-b border-slate-100 px-5 py-4">
            <div className="h-4 w-8 bg-slate-100" />
            <div className="h-4 w-28 bg-slate-200" />
            <div className="h-4 flex-1 bg-slate-100" />
            <div className="h-4 w-40 bg-slate-100" />
            <div className="h-6 w-24 bg-slate-100" />
          </div>
        ))}
      </div>
    </main>
  );
}
