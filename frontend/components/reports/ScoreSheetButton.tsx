'use client';

import { useState, type ComponentProps } from 'react';
import { HiDocumentText } from 'react-icons/hi';
import PrintScoreModal from './PrintScoreModal';

type Props = Omit<ComponentProps<typeof PrintScoreModal>, 'onClose'>;

// Opens the signed evaluation sheet (each signer's QR code included) for the
// sender once the manager has approved the scores.
export default function ScoreSheetButton(props: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <HiDocumentText size={16} />
        Үнэлгээний хуудас
      </button>
      {open && <PrintScoreModal {...props} onClose={() => setOpen(false)} />}
    </>
  );
}
