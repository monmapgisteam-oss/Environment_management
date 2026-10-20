export default function LoadingSpinner() {
  return (
    <div className="flex flex-1 items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-slate-200 border-t-[#1E293B]" />
        <p className="text-sm text-slate-400">Уншиж байна...</p>
      </div>
    </div>
  );
}
