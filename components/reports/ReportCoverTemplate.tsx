'use client';

import { useMemo, useState } from 'react';
import { HiCheckCircle, HiKey, HiPrinter, HiX } from 'react-icons/hi';

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

const lineClass =
  'min-h-[44px] w-full resize-none rounded-none border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0F766E]';

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        defaultValue={value}
        rows={1}
        className={lineClass}
        onInput={(event) => {
          const target = event.currentTarget;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
    </label>
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

function SignatureRow({ label, person, verifiedAt }: { label: string; person: Person; verifiedAt: string | null }) {
  return (
    <div className="grid grid-cols-[1fr_auto] items-start gap-5 border-b border-slate-200 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-base font-bold text-slate-950">{person.name}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-600">{person.position || person.roleLabel}</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        <img
          src={person.qrUrl}
          alt={`${person.name} QR`}
          className="h-[92px] w-[92px] rounded-lg border border-slate-200 bg-white p-1.5"
        />
        {verifiedAt && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-200">
            <HiCheckCircle size={16} />
            Гарын үсгээр баталгаажсан
          </span>
        )}
      </div>
    </div>
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
          <h1 className="text-xl font-bold text-slate-900">Тайлангийн нүүр</h1>
          <p className="mt-1 text-sm text-slate-500">Хүлээн авагч талын дотоод нүүр хуудас</p>
        </div>

        <div className="flex items-center gap-2">
          {currentSigner && (
            <button
              type="button"
              onClick={currentVerified ? undefined : openSignatureModal}
              disabled={currentVerified}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                currentVerified
                  ? 'cursor-not-allowed bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HiKey size={18} />
              {currentVerified ? 'Гарын үсэг баталгаажсан' : 'Тоон гарын үсэг'}
            </button>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#0F766E] px-4 text-sm font-semibold text-white transition hover:bg-[#115E59]"
          >
            <HiPrinter size={18} />
            Хэвлэх
          </button>
        </div>
      </div>

      <section className="cover-page mx-auto mb-6 flex w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[18mm] shadow-xl">
        <div className="border-b-2 border-slate-900 pb-5 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Тайлангийн нүүр</p>
          <h2 className="mt-10 text-3xl font-bold leading-tight text-slate-950">{info.title}</h2>
        </div>

        <div className="mt-10 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <InfoLine label="Тайлангийн дугаар" value={info.reportNumber} />
          <InfoLine label="Тайлангийн төрөл" value={info.reportType} />
          <InfoLine label="Илгээсэн байгууллага" value={info.senderCompanyName} />
          <InfoLine label="Илгээсэн огноо" value={info.submittedAt} />
          <InfoLine label="Төсөл хэрэгжүүлэгч" value={info.implementerName} />
          <InfoLine label="Регистр" value={info.implementerRegister} />
          <InfoLine label="Батлагдсан огноо" value={info.approvedDate} />
          <InfoLine label="Эцсийн оноо" value={info.finalScore} />
        </div>

        <div className="mt-7 space-y-5">
          <InfoLine label="Байршил" value={info.locationLabel} />
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Нэмэлт мэдээлэл</span>
            <textarea
              defaultValue={info.description}
              rows={8}
              className="mt-2 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm font-medium leading-6 text-slate-900 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
            />
          </label>
        </div>

        <div className="mt-auto pt-10 text-center text-sm font-medium text-slate-500">{new Date().getFullYear()} он</div>
      </section>

      <section className="cover-page mx-auto flex w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[18mm] shadow-xl">
        <div className="border-b-2 border-slate-900 pb-5">
          <h2 className="text-2xl font-bold text-slate-950">{info.title}</h2>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 px-5">
          {staffRows.length > 0 ? (
            staffRows.map((person, index) => (
              <SignatureRow
                key={person.id}
                label={index === 0 ? 'Боловсруулсан' : 'Хамтран боловсруулсан'}
                person={person}
                verifiedAt={verifiedSignatures[person.id] || null}
              />
            ))
          ) : (
            <div className="py-5 text-sm font-medium text-slate-500">Боловсруулсан ажилтан оноогдоогүй байна.</div>
          )}
        </div>

        {manager && (
          <div className="mt-6 rounded-xl border border-slate-200 px-5">
            <SignatureRow
              label={verifiedSignatures[manager.id] ? 'Хянасан, баталгаажуулсан' : 'Хянасан'}
              person={manager}
              verifiedAt={verifiedSignatures[manager.id] || null}
            />
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Боловсруулсан огноо</span>
            <input type="date" className={lineClass} />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Баталгаажуулсан огноо</span>
            <input type="date" value={toDateInputValue(managerVerifiedAt)} readOnly className={lineClass} />
          </label>
        </div>

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Нэрийн арын QR кодыг уншуулснаар тухайн ажилтан болон менежерийн баталгаажсан мэдээлэл, тоон гарын үсгийн хэсэг харагдана.
        </div>
      </section>

      {signatureModalOpen && currentSigner && (
        <div className="cover-signature-modal fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-950">Тоон гарын үсэг</h2>
                <p className="mt-1 text-sm text-slate-500">{currentSigner.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Хаах"
              >
                <HiX size={20} />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Өөрийн тоон гарын үсэг
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pendingSignature}
                onChange={(event) => setPendingSignature(event.target.value.replace(/\D/g, ''))}
                placeholder="Тоон гарын үсгээ оруулна уу"
                className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0F766E] focus:ring-2 focus:ring-teal-100"
              />
            </label>
            {signatureError && (
              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {signatureError}
              </p>
            )}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmSignature}
                disabled={!pendingSignature.trim() || isVerifying}
                className="flex-1 rounded-xl bg-[#0F766E] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#115E59] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isVerifying ? 'Шалгаж байна...' : 'Баталгаажуулах'}
              </button>
              <button
                type="button"
                onClick={() => setSignatureModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
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
