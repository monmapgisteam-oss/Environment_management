'use client';

import { useMemo, useState } from 'react';
import { HiCheckCircle, HiClock, HiKey, HiPrinter, HiX } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';

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
};

type Props = {
  reportId: string;
  info: CoverInfo;
  staff: Person[];
  manager: Person | null;
  viewerRole: 'manager' | 'staff';
  currentUserId: null | string;
  initialVerifiedSignatures: Array<{ userId: string; verifiedAt: string }>;
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

export default function ReportCoverTemplate({
  reportId,
  info,
  staff,
  manager,
  viewerRole,
  currentUserId,
  initialVerifiedSignatures,
}: Props) {
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [pendingSignature, setPendingSignature] = useState('');
  const [signatureError, setSignatureError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedSignatures, setVerifiedSignatures] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialVerifiedSignatures.map((signature) => [signature.userId, signature.verifiedAt])),
  );
  const staffRows = useMemo(() => (staff.length > 0 ? staff : []), [staff]);
  const currentSigner =
    viewerRole === 'manager'
      ? manager
      : staffRows.find((person) => person.id === currentUserId) || null;
  const currentVerified = currentUserId ? Boolean(verifiedSignatures[currentUserId]) : false;
  const managerVerifiedAt = manager ? verifiedSignatures[manager.id] || '' : '';

  const openSignatureModal = () => {
    setPendingSignature('');
    setSignatureError('');
    setSignatureModalOpen(true);
  };

  const confirmSignature = async () => {
    if (!currentUserId || !pendingSignature.trim() || isVerifying) return;
    setIsVerifying(true);
    setSignatureError('');

    try {
      const response = await fetch(`/api/reports/${reportId}/cover-signature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature: pendingSignature }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        setSignatureError(result.error || 'Гарын үсэг баталгаажуулахад алдаа гарлаа.');
        return;
      }

      setVerifiedSignatures((current) => ({
        ...current,
        [result.userId || currentUserId]: result.verifiedAt || new Date().toISOString(),
      }));
      setPendingSignature('');
      setSignatureModalOpen(false);
    } catch {
      setSignatureError('Сүлжээний алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setIsVerifying(false);
    }
  };

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
          .cover-signature-modal { display: none !important; }
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
          <h1 className="text-xl font-bold text-slate-900">Гарын үсгээр баталгаажуулах</h1>
          <p className="mt-1 text-sm text-slate-500">Тайлангийн нүүрийг шалгаад тоон гарын үсгээр баталгаажуулж, хэвлэнэ.</p>
        </div>

        <div className="flex items-center gap-2">
          {currentSigner && (
            <button
              type="button"
              onClick={currentVerified ? undefined : openSignatureModal}
              disabled={currentVerified}
              className={`inline-flex h-10 items-center gap-2 px-4 text-sm font-semibold transition ${
                currentVerified
                  ? 'cursor-not-allowed bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HiKey size={18} />
              {currentVerified ? 'Гарын үсгээр баталгаажсан' : 'Гарын үсгээр баталгаажуулах'}
            </button>
          )}

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
                  verifiedAt={verifiedSignatures[person.id] || null}
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
              <SignerRow
                index={staffRows.length + 1}
                role={verifiedSignatures[manager.id] ? 'Хянаж, баталгаажуулсан' : 'Хянасан'}
                person={manager}
                verifiedAt={verifiedSignatures[manager.id] || null}
              />
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

      {signatureModalOpen && currentSigner && (
        <div className="cover-signature-modal fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Гарын үсгээр баталгаажуулах</h2>
                <p className="mt-1 text-sm text-slate-500">{currentSigner.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center text-slate-500 transition hover:bg-slate-100"
                aria-label="Хаах"
              >
                <HiX size={20} />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Тоон гарын үсгийн нууц үг
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pendingSignature}
                onChange={(event) => setPendingSignature(event.target.value.replace(/\D/g, ''))}
                placeholder="••••••"
                className="mt-2 h-11 w-full border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
              />
            </label>
            {signatureError && (
              <p className="mt-3 bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {signatureError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmSignature}
                disabled={!pendingSignature.trim() || isVerifying}
                className="flex-1 bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVerifying ? 'Шалгаж байна...' : 'Гарын үсэг зурж баталгаажуулах'}
              </button>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Болих
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
