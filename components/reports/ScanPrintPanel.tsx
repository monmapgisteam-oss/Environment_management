'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiPrinter, HiUpload, HiDocument } from 'react-icons/hi';
import { formatDate } from '@/lib/utils';
import PrintScoreModal from './PrintScoreModal';
import { offerUndo } from '@/lib/undo';

type Criterion = { id: string; name: string; maxScore: number };
type Evaluation = {
  evaluatorName: string;
  totalScore: number;
  scores: { criterionId: string; score: number; note?: string | null }[];
};

type Props = {
  reportId: string;
  signedScanName: string | null;
  signedScanUploadedAt: string | null;
  reportNumber: string;
  title: string;
  senderCompanyName: string;
  submittedAtLabel: string;
  implementerName: string;
  locationLabel: string;
  criteria: Criterion[];
  evaluations: Evaluation[];
};

// Manager-side controls once every evaluator has scored the report: preview
// and print the score table for physical signatures, then scan the signed
// copy back in and attach it here so the sender can download it.
export default function ScanPrintPanel({
  reportId,
  signedScanName,
  signedScanUploadedAt,
  reportNumber,
  title,
  senderCompanyName,
  submittedAtLabel,
  implementerName,
  locationLabel,
  criteria,
  evaluations,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [printOpen, setPrintOpen] = useState(false);
  // Picking a file only stages it — nothing is sent to the sender until the
  // manager explicitly confirms, so a wrong file can't go out by accident.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingFile || !pendingFile.type.startsWith('image/')) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(pendingFile);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [pendingFile]);

  const cancelPending = () => {
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const confirmSend = async () => {
    if (!pendingFile) return;
    const file = pendingFile;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      if (!uploadRes.ok) throw new Error();
      const uploaded = await uploadRes.json();

      const saveRes = await fetch(`/api/reports/${reportId}/signed-scan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: uploaded.url, name: uploaded.name }),
      });
      if (!saveRes.ok) throw new Error();
      const saved = await saveRes.json().catch(() => ({}));

      setPendingFile(null);
      router.refresh();
      offerUndo('Скан хуулга илгээгдлээ.', saved.undoToken, () => router.refresh());
    } catch {
      setError('Хуулга хадгалахад алдаа гарлаа. Дахин оролдоно уу.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      {signedScanName && (
        <span className="text-xs text-slate-500">
          {signedScanName} — {signedScanUploadedAt ? formatDate(new Date(signedScanUploadedAt)) : ''} илгээгдсэн
        </span>
      )}

      <button
        type="button"
        onClick={() => setPrintOpen(true)}
        className="inline-flex items-center gap-2 border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
      >
        <HiPrinter size={16} />
        Хэвлэх
      </button>

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="inline-flex items-center gap-2 bg-color-primary px-4 py-2 text-sm font-semibold text-white hover:bg-color-primary-dark transition disabled:opacity-60"
      >
        <HiUpload size={16} />
        {uploading ? 'Хуулж байна...' : signedScanName ? 'Скан хуулга дахин явуулах' : 'Скан хуулга явуулах'}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && setPendingFile(e.target.files[0])}
      />

      {pendingFile && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 p-4" onClick={() => !uploading && cancelPending()}>
          <div className="w-full max-w-md bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-base font-semibold text-slate-900">Скан хуулга илгээх үү?</h3>
            <p className="mt-1 text-sm text-slate-500">
              Энэ файл илгээгч байгууллагад шууд харагдана. Зөв файл эсэхийг шалгаад баталгаажуулна уу.
            </p>

            <div className="mt-4 border border-slate-200 p-3">
              {previewUrl ? (
                <img src={previewUrl} alt={pendingFile.name} className="mx-auto max-h-64 object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-slate-600">
                  <HiDocument size={20} />
                  <span className="text-sm font-medium truncate">{pendingFile.name}</span>
                </div>
              )}
            </div>

            {error && <p className="mt-3 text-sm font-medium text-red-500">{error}</p>}

            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={confirmSend}
                disabled={uploading}
                className="flex-1 bg-color-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-color-primary-dark transition disabled:opacity-60"
              >
                {uploading ? 'Илгээж байна...' : 'Илгээх'}
              </button>
              <button
                type="button"
                onClick={cancelPending}
                disabled={uploading}
                className="flex-1 border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
              >
                Цуцлах
              </button>
            </div>
          </div>
        </div>
      )}

      {printOpen && (
        <PrintScoreModal
          reportNumber={reportNumber}
          title={title}
          senderCompanyName={senderCompanyName}
          submittedAtLabel={submittedAtLabel}
          implementerName={implementerName}
          locationLabel={locationLabel}
          criteria={criteria}
          evaluations={evaluations}
          onClose={() => setPrintOpen(false)}
        />
      )}
    </div>
  );
}
