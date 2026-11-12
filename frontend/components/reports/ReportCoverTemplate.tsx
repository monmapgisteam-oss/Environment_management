'use client';

import { HiCheckCircle, HiClock, HiKey, HiPrinter } from 'react-icons/hi';
import { formatDate } from '@shared/utils';

type CoverInfo = {
  reportNumber: string;
  title: string;
  reportType: string;
  senderCompanyName: string;
  submittedAt: string;
  implementerName: string;
  implementerRegister: string;
  approvedDate: string;
  locationLabel: string;
  description: string;
  finalScore: string;
};

type Person = {
  id: string;
  name: string;
  roleLabel: string;
  position: string;
  qrUrl: string;
  // When this person signed: an evaluator's signed scores, the manager's
  // approval. Null while it waits.
  signedAt: string | null;
};

type Props = {
  info: CoverInfo;
  staff: Person[];
  // The manager who approved the scores, or null while they wait.
  manager: Person | null;
};

const ORGANIZATION = 'Нийслэлийн Байгаль орчны газар';
const SYSTEM_NAME = 'Байгаль орчны менежментийн төлөвлөгөөний систем';

const dateLineClass =
  'h-9 w-full border-0 border-b border-slate-400 bg-transparent px-0 text-sm font-semibold text-slate-900 outline-none focus:border-[#0F766E]';

// Values stay editable on screen so the manager can correct a line before
// printing; in print they read as plain text.
function EditableText({ value, rows = 1 }: { value: string; rows?: number }) {
  return (
    <textarea
      defaultValue={value}
      rows={rows}
      className="block w-full resize-none border-0 bg-transparent p-0 text-[13px] font-semibold leading-5 text-slate-900 outline-none transition hover:bg-teal-50/40 focus:bg-teal-50/60 print:hover:bg-transparent"
      onInput={(event) => {
        const target = event.currentTarget;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
      }}
    />
  );
}

function toDateInputValue(dateString: string) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <tr>
      <th scope="row" className="w-[52mm] border border-slate-300 bg-slate-50 px-3 py-2 text-left align-top text-[11px] font-semibold uppercase tracking-wide text-slate-600">
        {label}
      </th>
      <td className="border border-slate-300 px-3 py-2 align-top">
        <EditableText value={value} />
      </td>
    </tr>
  );
}

// Emblem, organisation and system name, closed by a double rule.
function DocumentHeader({ reportNumber, compact = false }: { reportNumber: string; compact?: boolean }) {
  return (
    <header>
      <div className={`flex items-center gap-4 ${compact ? '' : 'flex-col text-center'}`}>
        <img src="/logo.svg" alt="" className={compact ? 'h-12 w-12' : 'h-20 w-20'} />
        <div className={compact ? 'min-w-0 flex-1' : ''}>
          <p className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate-900">{ORGANIZATION}</p>
          <p className="mt-1 text-xs font-medium text-slate-500">{SYSTEM_NAME}</p>
        </div>
        {compact && (
          <p className="shrink-0 text-right text-[11px] text-slate-500">
            Тайлангийн дугаар
            <span className="block text-sm font-bold text-slate-900">{reportNumber}</span>
          </p>
        )}
      </div>
      <div className="mt-4 border-t-[3px] border-[#0F766E]" />
      <div className="mt-[3px] border-t border-[#0F766E]" />
    </header>
  );
}

function DocumentFooter({ page, pages }: { page: number; pages: number }) {
  return (
    <footer className="mt-auto flex items-center justify-between border-t border-slate-300 pt-3 text-[11px] text-slate-500">
      <span>Улаанбаатар хот, {new Date().getFullYear()} он</span>
      <span>
        {page} / {pages}
      </span>
    </footer>
  );
}

function SignerRow({ index, role, person, verifiedAt }: { index: number; role: string; person: Person; verifiedAt: string | null }) {
  return (
    <tr className="break-inside-avoid">
      <td className="border border-slate-300 px-2 py-3 text-center align-middle text-xs text-slate-600">{index}</td>
      <td className="border border-slate-300 px-3 py-3 align-middle text-xs font-semibold text-slate-700">{role}</td>
      <td className="border border-slate-300 px-3 py-3 align-middle">
        <p className="text-sm font-bold text-slate-950">{person.name}</p>
        <p className="mt-0.5 text-xs text-slate-600">{person.position || person.roleLabel}</p>
      </td>
      <td className="border border-slate-300 px-3 py-3 align-middle">
        {verifiedAt ? (
          <span className="inline-flex items-start gap-1.5 text-xs font-semibold text-emerald-700">
            <HiCheckCircle size={16} className="shrink-0" />
            <span>
              Баталгаажсан
              <span className="block font-medium text-slate-500">{formatDate(verifiedAt)}</span>
            </span>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400">
            <HiClock size={15} className="shrink-0" />
            Хүлээгдэж байна
          </span>
        )}
      </td>
      <td className="border border-slate-300 p-1.5 text-center align-middle">
        <img src={person.qrUrl} alt={`${person.name} QR`} className="mx-auto h-[24mm] w-[24mm]" />
      </td>
    </tr>
  );
}

// Printable cover. Nothing is signed here: each row shows the signature the
// person already made in the workflow (evaluators when submitting their
// scores, the manager when approving them).
export default function ReportCoverTemplate({ info, staff, manager }: Props) {
  const staffRows = staff;
  const managerVerifiedAt = manager?.signedAt || '';

  return (
    <div className="min-h-screen bg-slate-100 px-5 py-6 text-slate-950">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #ffffff !important; }
          html body > .app-shell { display: block !important; background: #ffffff !important; }
          .app-chrome { display: none !important; }
          .cover-main { padding: 0 !important; margin: 0 !important; }
          .cover-toolbar { display: none !important; }
          .cover-page {
            width: 210mm !important;
            min-height: 297mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            page-break-after: always;
          }
          .cover-page:last-child { page-break-after: auto; }
          textarea { overflow: hidden !important; }
        }
      `}</style>

      <div className="cover-toolbar mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Тайлангийн нүүр хуудас</h1>
          <p className="mt-1 text-sm text-slate-500">
            {manager
              ? 'Гишүүдийн болон менежерийн тоон гарын үсэгтэй нүүр хуудас. Шалгаад хэвлэнэ үү.'
              : 'Үнэлгээ батлагдаагүй байна. Менежер баталсны дараа баталгаажуулалт энд гарна.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
          >
            <HiPrinter size={18} />
            Хэвлэх
          </button>
        </div>
      </div>

      <section className="cover-page theme-light mx-auto mb-6 flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] text-slate-900 shadow-xl">
        <DocumentHeader reportNumber={info.reportNumber} />

        <div className="mt-10 text-center">
          <p className="inline-block border border-[#0F766E] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F766E]">
            {info.reportType}
          </p>
          <h2 className="mx-auto mt-5 max-w-[150mm] text-[26px] font-bold leading-tight text-slate-950">{info.title}</h2>
          <p className="mt-2 text-sm text-slate-500">Тайлангийн нүүр хуудас</p>
        </div>

        <div className="mx-auto mt-8 flex items-stretch border-2 border-[#0F766E]">
          <div className="flex flex-col justify-center bg-[#0F766E] px-5 py-3 text-white">
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-teal-100">Эцсийн оноо</span>
            <span className="text-[10px] text-teal-100">Үнэлгээний дундаж</span>
          </div>
          <div className="flex items-baseline gap-1 px-6 py-2">
            <span className="text-4xl font-bold tabular-nums text-[#0F766E]">{info.finalScore}</span>
            {info.finalScore !== '-' && <span className="text-sm font-semibold text-slate-500">оноо</span>}
          </div>
        </div>

        <table className="mt-9 w-full border-collapse">
          <tbody>
            <InfoRow label="Тайлангийн дугаар" value={info.reportNumber} />
            <InfoRow label="Тайлангийн төрөл" value={info.reportType} />
            <InfoRow label="Илгээсэн байгууллага" value={info.senderCompanyName} />
            <InfoRow label="Төсөл хэрэгжүүлэгч" value={info.implementerName} />
            <InfoRow label="Регистрийн дугаар" value={info.implementerRegister} />
            <InfoRow label="Илгээсэн огноо" value={info.submittedAt} />
            <InfoRow label="Батлагдсан огноо" value={info.approvedDate} />
            <InfoRow label="Байршил" value={info.locationLabel} />
          </tbody>
        </table>

        <div className="mt-6 border border-slate-300">
          <p className="border-b border-slate-300 bg-slate-50 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-600">
            Нэмэлт мэдээлэл
          </p>
          <div className="min-h-[34mm] px-3 py-2.5">
            <EditableText value={info.description} rows={5} />
          </div>
        </div>

        <div className="pt-8" />
        <DocumentFooter page={1} pages={2} />
      </section>

      <section className="cover-page theme-light mx-auto flex min-h-[297mm] w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[16mm] text-slate-900 shadow-xl">
        <DocumentHeader reportNumber={info.reportNumber} compact />

        <div className="mt-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#0F766E]">Гарын үсгийн хуудас</p>
          <h2 className="mt-2 text-xl font-bold leading-snug text-slate-950">{info.title}</h2>
        </div>

        <table className="mt-6 w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-600">
              <th className="w-[9mm] border border-slate-300 px-2 py-2 text-center">№</th>
              <th className="w-[34mm] border border-slate-300 px-3 py-2">Үүрэг</th>
              <th className="border border-slate-300 px-3 py-2">Овог нэр, албан тушаал</th>
              <th className="w-[36mm] border border-slate-300 px-3 py-2">Тоон гарын үсэг</th>
              <th className="w-[28mm] border border-slate-300 px-2 py-2 text-center">QR</th>
            </tr>
          </thead>
          <tbody>
            {staffRows.length > 0 ? (
              staffRows.map((person, index) => (
                <SignerRow
                  key={person.id}
                  index={index + 1}
                  role={index === 0 ? 'Боловсруулсан' : 'Хамтран боловсруулсан'}
                  person={person}
                  verifiedAt={person.signedAt}
                />
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-slate-300 px-3 py-5 text-center text-sm text-slate-500">
                  Боловсруулсан ажилтан оноогдоогүй байна.
                </td>
              </tr>
            )}
            {manager && (
              <SignerRow index={staffRows.length + 1} role="Хянаж, баталсан" person={manager} verifiedAt={manager.signedAt} />
            )}
          </tbody>
        </table>

        <div className="mt-8 grid grid-cols-2 gap-8">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Боловсруулсан огноо</span>
            <input type="date" className={dateLineClass} />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Баталгаажуулсан огноо</span>
            <input type="date" value={toDateInputValue(managerVerifiedAt)} readOnly className={dateLineClass} />
          </label>
        </div>

        <div className="mt-auto pt-10">
          <div className="mb-4 flex items-start gap-3 border-l-[3px] border-[#0F766E] bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
            <HiKey size={16} className="mt-0.5 shrink-0 text-[#0F766E]" />
            <p>
              Тоон гарын үсгийг системээс олгосон нууц үгээр баталгаажуулсан. QR кодыг уншуулж тухайн ажилтны нэр, албан
              тушаал, холбоо барих мэдээллийг системээс шалгана уу.
            </p>
          </div>
          <DocumentFooter page={2} pages={2} />
        </div>
      </section>
    </div>
  );
}
