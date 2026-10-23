'use client';

import { createPortal } from 'react-dom';
import { HiPrinter, HiX } from 'react-icons/hi';

type Criterion = { id: string; name: string; maxScore: number };
type Evaluation = {
  evaluatorName: string;
  totalScore: number;
  scores: { criterionId: string; score: number; note?: string | null }[];
};

type Props = {
  reportNumber: string;
  title: string;
  senderCompanyName: string;
  submittedAtLabel: string;
  implementerName: string;
  locationLabel: string;
  criteria: Criterion[];
  evaluations: Evaluation[];
  onClose: () => void;
};

// Officially formatted, landscape-A4 print view of the evaluation scores,
// portalled onto <body> so print CSS (see globals.css) can hide the rest of
// the app and print only this — no separate tab/page needed.
export default function PrintScoreModal({
  reportNumber,
  title,
  senderCompanyName,
  submittedAtLabel,
  implementerName,
  locationLabel,
  criteria,
  evaluations,
  onClose,
}: Props) {
  const maxTotal = criteria.reduce((sum, c) => sum + c.maxScore, 0);

  return createPortal(
    <div className="print-portal fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4 print:static print:bg-transparent print:p-0">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden bg-white shadow-2xl print:max-h-none print:w-auto print:max-w-none print:overflow-visible print:rounded-none print:shadow-none">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 print:hidden">
          <h2 className="text-base font-semibold text-slate-900">Хэвлэх урьдчилан харах</h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 bg-color-primary px-4 py-2 text-sm font-semibold text-white hover:bg-color-primary-dark transition"
            >
              <HiPrinter size={16} />
              Хэвлэх
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center border border-slate-200 text-slate-500 hover:bg-slate-50 transition"
              aria-label="Хаах"
            >
              <HiX size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-8 py-8 font-serif print:overflow-visible print:p-0">
          <div className="mx-auto max-w-5xl print:max-w-none">
            <div className="mb-6 text-center">
              <h1 className="text-xl font-bold text-slate-900">Үнэлгээний дүн</h1>
            </div>

            <div className="mb-6 grid grid-cols-2 gap-x-8 gap-y-1.5 text-sm">
              <p><span className="text-slate-500">Тайлангийн дугаар:</span> <span className="font-semibold text-slate-900">{reportNumber}</span></p>
              <p><span className="text-slate-500">Огноо:</span> <span className="font-semibold text-slate-900">{submittedAtLabel}</span></p>
              <p><span className="text-slate-500">Илгээсэн байгууллага:</span> <span className="font-semibold text-slate-900">{senderCompanyName}</span></p>
              <p><span className="text-slate-500">Төслийн нэр:</span> <span className="font-semibold text-slate-900">{title}</span></p>
              {implementerName && (
                <p><span className="text-slate-500">Төсөл хэрэгжүүлэгчийн нэр:</span> <span className="font-semibold text-slate-900">{implementerName}</span></p>
              )}
              {locationLabel && (
                <p><span className="text-slate-500">Төслийн байршил:</span> <span className="font-semibold text-slate-900">{locationLabel}</span></p>
              )}
            </div>

            <table className="w-full border-collapse text-[11px]">
              <thead>
                <tr>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-1.5 py-2 font-bold text-slate-800 w-8">№</th>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-2 py-2 text-left font-bold text-slate-800 w-52">
                    Тухайн жилийн байгаль орчны менежментийн төлөвлөгөөний бүрэлдэхүүн хэсгүүд
                  </th>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-1.5 py-2 font-bold text-slate-800 w-14">
                    Авсан байвал зохих оноо
                  </th>
                  <th colSpan={evaluations.length} className="border border-slate-500 bg-slate-100 px-2 py-1.5 font-bold text-slate-800 text-center">
                    Ажлын хэсгийн гишүүдийн үнэлсэн оноо
                  </th>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-1.5 py-2 font-bold text-slate-800 w-16">
                    Гишүүдийн үнэлсэн онооны энгийн арифметик дундаж
                  </th>
                  <th rowSpan={2} className="border border-slate-500 bg-slate-100 px-1.5 py-2 font-bold text-slate-800 w-56">
                    Үндэслэл, тайлбар
                  </th>
                </tr>
                <tr>
                  {evaluations.map((ev, i) => (
                    <th key={i} className="border border-slate-500 bg-slate-50 px-1.5 py-1.5 font-semibold text-slate-700 text-center whitespace-nowrap">
                      {ev.evaluatorName || `Гишүүн ${i + 1}`}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {criteria.map((c, ci) => {
                  const rowScores = evaluations.map((ev) => ev.scores.find((s) => s.criterionId === c.id)?.score ?? null);
                  const scored = rowScores.filter((s): s is number => s != null);
                  const avg = scored.length ? scored.reduce((sum, s) => sum + s, 0) / scored.length : null;
                  // Each member's үндэслэл; names are shown when several members scored.
                  const notes = evaluations
                    .map((ev) => ({ name: ev.evaluatorName, note: ev.scores.find((s) => s.criterionId === c.id)?.note?.trim() }))
                    .filter((entry): entry is { name: string; note: string } => !!entry.note);
                  return (
                    <tr key={c.id} className="break-inside-avoid">
                      <td className="border border-slate-400 px-1.5 py-2 text-center">{ci + 1}</td>
                      <td className="border border-slate-400 px-2 py-2">{c.name}</td>
                      <td className="border border-slate-400 px-1.5 py-2 text-center font-semibold">{c.maxScore}</td>
                      {rowScores.map((score, i) => (
                        <td key={i} className="border border-slate-400 px-1.5 py-2 text-center">{score ?? ''}</td>
                      ))}
                      <td className="border border-slate-400 px-1.5 py-2 text-center font-semibold">
                        {avg != null ? Math.round(avg * 10) / 10 : ''}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-2 align-top space-y-1">
                        {notes.map((entry, i) => (
                          <p key={i} className="whitespace-pre-wrap">
                            {evaluations.length > 1 && <span className="font-semibold">{entry.name}: </span>}
                            {entry.note}
                          </p>
                        ))}
                      </td>
                    </tr>
                  );
                })}
                <tr>
                  <td className="border border-slate-500 bg-slate-50" />
                  <td className="border border-slate-500 bg-slate-50 px-2 py-2 font-bold">Нийт оноо</td>
                  <td className="border border-slate-500 bg-slate-50 px-1.5 py-2 text-center font-bold">{maxTotal}</td>
                  {evaluations.map((ev, i) => (
                    <td key={i} className="border border-slate-500 bg-slate-50 px-1.5 py-2 text-center font-bold">{ev.totalScore}</td>
                  ))}
                  <td className="border border-slate-500 bg-slate-50 px-1.5 py-2 text-center font-bold">
                    {evaluations.length ? Math.round((evaluations.reduce((sum, ev) => sum + ev.totalScore, 0) / evaluations.length) * 10) / 10 : ''}
                  </td>
                  <td className="border border-slate-500 bg-slate-50" />
                </tr>
              </tbody>
            </table>

            {/* Signatures — below the table, one short line per evaluator,
                stacked one under another (matching the paper form's layout). */}
            <div className="mt-10 space-y-3 break-inside-avoid">
              {evaluations.map((ev, i) => (
                <div key={i} className="flex items-end gap-2">
                  <span className="shrink-0 text-sm text-slate-700">{ev.evaluatorName}:</span>
                  <span className="w-32 border-b border-slate-500" />
                </div>
              ))}
            </div>

            <p className="mt-10 text-[11px] text-slate-400 print:mt-12">
              Хэвлэсэн огноо: {new Date().toLocaleDateString('mn-MN')}
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
