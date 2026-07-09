'use client';

import { useMemo, useState } from 'react';
import { HiCheckCircle, HiPrinter } from 'react-icons/hi';

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
  info: CoverInfo;
  staff: Person[];
  manager: Person | null;
  viewerRole: 'manager' | 'staff';
};

const fieldClass =
  'min-h-[44px] w-full resize-none rounded-none border-0 border-b border-slate-300 bg-transparent px-0 py-2 text-sm font-semibold text-slate-900 outline-none transition focus:border-[#0F766E]';

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <label className="block">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</span>
      <textarea
        defaultValue={value}
        rows={1}
        className={fieldClass}
        onInput={(event) => {
          const target = event.currentTarget;
          target.style.height = 'auto';
          target.style.height = `${target.scrollHeight}px`;
        }}
      />
    </label>
  );
}

function PersonLine({ label, person }: { label: string; person: Person }) {
  return (
    <div className="grid grid-cols-[1fr_92px] items-center gap-5 border-b border-slate-200 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 text-base font-bold text-slate-950">{person.name}</p>
        <p className="mt-0.5 text-sm font-medium text-slate-600">{person.position || person.roleLabel}</p>
      </div>
      <img
        src={person.qrUrl}
        alt={`${person.name} QR`}
        className="h-[92px] w-[92px] rounded-lg border border-slate-200 bg-white p-1.5"
      />
    </div>
  );
}

export default function ReportCoverTemplate({ info, staff, manager, viewerRole }: Props) {
  const [finalized, setFinalized] = useState(false);
  const staffRows = useMemo(() => (staff.length > 0 ? staff : []), [staff]);

  return (
    <div className="print-portal min-h-screen bg-slate-100 px-5 py-6 text-slate-950">
      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 0; }
          html, body { background: #ffffff !important; }
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
          <h1 className="text-xl font-bold text-slate-900">Тайлангийн нүүр</h1>
          <p className="mt-1 text-sm text-slate-500">Хүлээн авагч талын дотоод нүүр хуудас</p>
        </div>
        <div className="flex items-center gap-2">
          {viewerRole === 'manager' && (
            <button
              type="button"
              onClick={() => setFinalized((current) => !current)}
              className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${
                finalized
                  ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                  : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <HiCheckCircle size={18} />
              {finalized ? 'Баталгаажсан' : 'Менежер баталгаажуулах'}
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

        <div className="mt-auto pt-10 text-center text-sm font-medium text-slate-500">
          {new Date().getFullYear()} он
        </div>
      </section>

      <section className="cover-page mx-auto flex w-full max-w-[210mm] flex-col bg-white px-[18mm] py-[18mm] shadow-xl">
        <div className="border-b-2 border-slate-900 pb-5">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Гарын үсгийн хэсэг</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{info.title}</h2>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 px-5">
          {staffRows.length > 0 ? (
            staffRows.map((person, index) => (
              <PersonLine key={person.id} label={index === 0 ? 'Боловсруулсан' : 'Хамтран боловсруулсан'} person={person} />
            ))
          ) : (
            <div className="py-5 text-sm font-medium text-slate-500">Боловсруулсан ажилтан оноогдоогүй байна.</div>
          )}
        </div>

        {manager && (
          <div className="mt-6 rounded-xl border border-slate-200 px-5">
            <PersonLine label={finalized ? 'Хянасан, баталгаажуулсан' : 'Хянасан'} person={manager} />
          </div>
        )}

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Боловсруулсан огноо</span>
            <input type="date" className={fieldClass} />
          </label>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Баталгаажуулсан огноо</span>
            <input type="date" className={fieldClass} />
          </label>
        </div>

        <div className="mt-auto rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          Нэрийн арын QR кодыг уншуулснаар тухайн ажилтан болон менежерийн баталгаажсан мэдээлэл, тоон гарын үсгийн хэсэг харагдана.
        </div>
      </section>
    </div>
  );
}
