'use client';

import { useState } from 'react';
import { HiCheckCircle, HiClock, HiExclamation } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';

type Status = 'VERIFIED' | 'PENDING' | 'INVALID' | string;

type Props = {
  status: Status;
  signedAt?: string | null;
  signatureId?: string | null;
  signerName: string;
  documentHash?: string | null;
  // Controls which safe metadata the detail popover reveals — never the raw
  // signature/PIN, which this component is never given in the first place.
  viewerRole: 'sender' | 'manager' | 'staff';
};

const STYLES: Record<string, { icon: typeof HiCheckCircle; label: string; className: string }> = {
  VERIFIED: { icon: HiCheckCircle, label: 'Баталгаажсан', className: 'text-emerald-600' },
  PENDING: { icon: HiClock, label: 'Хүлээгдэж байна', className: 'text-amber-500' },
  INVALID: { icon: HiExclamation, label: 'Баталгаажаагүй', className: 'text-red-500' },
};

// Safe verification badge — only ever receives signatureStatus/signedAt/
// signatureId/documentHash, never the raw numeric signature/PIN.
export default function SignatureBadge({ status, signedAt, signatureId, signerName, documentHash, viewerRole }: Props) {
  const [open, setOpen] = useState(false);
  const style = STYLES[status] || STYLES.PENDING;
  const Icon = style.icon;
  const canSeeDetail = status === 'VERIFIED' && (viewerRole === 'sender' || viewerRole === 'manager');

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => canSeeDetail && setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center gap-1 text-xs font-medium ${style.className} ${canSeeDetail ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <Icon size={14} />
        {style.label}
      </button>

      {open && canSeeDetail && (
        <div className="absolute left-1/2 top-full z-50 mt-1.5 w-60 -translate-x-1/2 border border-slate-200 bg-white p-3 text-left text-xs shadow-lg">
          <p className="text-slate-500">
            Гарын үсэг зурсан: <span className="font-medium text-slate-800">{signerName}</span>
          </p>
          {signedAt && (
            <p className="mt-1 text-slate-500">
              Огноо: <span className="font-medium text-slate-800">{formatDate(signedAt)}</span>
            </p>
          )}
          <p className="mt-1 text-slate-500">
            Төлөв: <span className="font-medium text-emerald-600">{style.label}</span>
          </p>
          {signatureId && (
            <p className="mt-1 text-slate-500">
              ID: <span className="font-medium text-slate-800">{signatureId}</span>
            </p>
          )}
          {viewerRole === 'manager' && documentHash && (
            <p className="mt-1 break-all text-slate-500">
              Баримтын хэш: <span className="font-mono text-[10px] text-slate-700">{documentHash}</span>
            </p>
          )}
        </div>
      )}
    </span>
  );
}
