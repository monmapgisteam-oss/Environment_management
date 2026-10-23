'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HiCheckCircle, HiOutlineDocumentText, HiOutlineReply, HiOutlineTrash, HiUpload, HiX } from 'react-icons/hi';
import type { SignedSectionFile } from '@/lib/reports/reportSections';
import type { RevisionItem } from '@/lib/reports/revisions';
import { toast } from '@/lib/toast';

type FlaggedSection = RevisionItem & { group: string; files: SignedSectionFile[] };

type Props = {
  reportId: string;
  reason: string | null;
  items: FlaggedSection[];
};

type Draft = { removed: string[]; added: File[] };

// Senders attach PDF only (the upload API refuses anything else).
const accept = 'application/pdf,.pdf';
const allowedPattern = /\.pdf$/i;

async function uploadFile(file: File) {
  const body = new FormData();
  body.append('file', file);
  body.append('purpose', 'report-attachment');
  const res = await fetch('/api/upload', { method: 'POST', body });
  if (!res.ok) throw new Error('upload failed');
  const data = (await res.json()) as { url: string; name: string };
  return { url: data.url, name: data.name };
}

// One card per flagged section: the reviewer's comment, the files there now
// (each can be removed) and new files to add. Every card must change before
// the report can be sent back.
export default function RevisionForm({ reportId, reason, items }: Props) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(items.map((item) => [item.key, { removed: [], added: [] }])),
  );
  const [sending, setSending] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const inputs = useRef<Record<string, HTMLInputElement | null>>({});

  const changed = (key: string) => drafts[key].added.length > 0 || drafts[key].removed.length > 0;
  const doneCount = items.filter((item) => changed(item.key)).length;

  const update = (key: string, next: (draft: Draft) => Draft) =>
    setDrafts((current) => ({ ...current, [key]: next(current[key]) }));

  // The first new file in a section replaces the files already there; the
  // sender can restore one of them if it should stay.
  const addFiles = (item: FlaggedSection, list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const valid = picked.filter((file) => allowedPattern.test(file.name));
    if (valid.length < picked.length) toast('Зөвхөн PDF файл хавсаргана уу.', 'error');
    if (valid.length)
      update(item.key, (draft) => ({
        removed: draft.added.length === 0 ? item.files.map((file) => file.url) : draft.removed,
        added: [...draft.added, ...valid],
      }));
  };

  const submit = async () => {
    if (doneCount < items.length) {
      setShowErrors(true);
      const first = items.find((item) => !changed(item.key));
      if (first) document.getElementById(`revise-${first.key}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSending(true);
    try {
      const fixes = [];
      for (const item of items) {
        const draft = drafts[item.key];
        const added = [];
        for (const file of draft.added) added.push(await uploadFile(file));
        fixes.push({
          key: item.key,
          keepUrls: item.files.filter((file) => !draft.removed.includes(file.url)).map((file) => file.url),
          added,
        });
      }
      const res = await fetch(`/api/reports/${reportId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fixes }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error || 'Засвар илгээхэд алдаа гарлаа.', 'error');
        setSending(false);
        return;
      }
      toast('Засвар илгээгдлээ.');
      router.push(`/report/${reportId}?role=sender`);
      router.refresh();
    } catch {
      toast('Файл хуулах үед алдаа гарлаа. Дахин оролдоно уу.', 'error');
      setSending(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
      <div className="space-y-4">
        {reason && (
          <div className="border border-orange-200 bg-orange-50/40 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-orange-700">Ерөнхий тайлбар</p>
            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{reason}</p>
          </div>
        )}

        {items.map((item, index) => {
          const draft = drafts[item.key];
          const done = changed(item.key);
          const error = showErrors && !done;
          return (
            <section
              key={item.key}
              id={`revise-${item.key}`}
              className={`border bg-white ${error ? 'border-rose-300' : done ? 'border-teal-300' : 'border-slate-200'}`}
            >
              <header className="flex items-start gap-3 border-b border-slate-100 px-5 py-4">
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center text-xs font-bold ${
                    done ? 'bg-teal-600 text-white' : 'bg-orange-100 text-orange-700'
                  }`}
                >
                  {done ? <HiCheckCircle size={16} /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.group}</p>
                  <h2 className="text-sm font-semibold leading-snug text-slate-900">{item.label}</h2>
                </div>
              </header>

              <div className="space-y-4 px-5 py-4">
                <div className="border-l-2 border-orange-400 bg-orange-50/60 px-3 py-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-orange-700">Хянагчийн тайлбар</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-700">{item.comment}</p>
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">
                    Одоогийн файл
                    {draft.removed.length > 0 && (
                      <span className="ml-2 font-normal text-rose-600">· зурсан файлууд илгээх үед бүрмөсөн устгагдана</span>
                    )}
                  </p>
                  {item.files.length === 0 ? (
                    <p className="text-sm text-slate-400">Энэ хэсэгт файл хавсаргаагүй байна.</p>
                  ) : (
                    <ul className="divide-y divide-slate-100 border border-slate-200">
                      {item.files.map((file) => {
                        const removed = draft.removed.includes(file.url);
                        return (
                          <li key={file.url} className={`flex items-center gap-3 px-3 py-2 ${removed ? 'bg-slate-50' : ''}`}>
                            <HiOutlineDocumentText size={16} className="shrink-0 text-slate-400" />
                            <a
                              href={file.viewUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`min-w-0 flex-1 truncate text-sm ${removed ? 'text-slate-400 line-through' : 'text-slate-700 hover:text-teal-700'}`}
                            >
                              {file.name}
                            </a>
                            <button
                              type="button"
                              onClick={() =>
                                update(item.key, (current) => ({
                                  ...current,
                                  removed: removed ? current.removed.filter((url) => url !== file.url) : [...current.removed, file.url],
                                }))
                              }
                              className={`inline-flex shrink-0 items-center gap-1 text-xs font-semibold ${
                                removed ? 'text-teal-700 hover:underline' : 'text-rose-600 hover:underline'
                              }`}
                            >
                              {removed ? (
                                <>
                                  <HiOutlineReply size={14} /> Сэргээх
                                </>
                              ) : (
                                <>
                                  <HiOutlineTrash size={14} /> Устгах
                                </>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <p className="mb-2 text-xs font-semibold text-slate-500">Шинэ файл</p>
                  {draft.added.length > 0 && (
                    <ul className="mb-2 divide-y divide-teal-100 border border-teal-200 bg-teal-50/40">
                      {draft.added.map((file, fileIndex) => (
                        <li key={`${file.name}-${fileIndex}`} className="flex items-center gap-3 px-3 py-2">
                          <HiOutlineDocumentText size={16} className="shrink-0 text-teal-600" />
                          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">{file.name}</span>
                          <button
                            type="button"
                            onClick={() =>
                              update(item.key, (current) => ({ ...current, added: current.added.filter((_, i) => i !== fileIndex) }))
                            }
                            className="shrink-0 text-slate-400 hover:text-rose-600"
                            aria-label="Хасах"
                          >
                            <HiX size={16} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    ref={(element) => {
                      inputs.current[item.key] = element;
                    }}
                    type="file"
                    multiple
                    accept={accept}
                    className="sr-only"
                    onChange={(event) => {
                      addFiles(item, event.target.files);
                      event.target.value = '';
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => inputs.current[item.key]?.click()}
                    className="flex w-full items-center justify-center gap-2 border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm font-semibold text-teal-700 transition hover:border-teal-500 hover:bg-teal-50/50"
                  >
                    <HiUpload size={16} /> {item.files.length > 0 && draft.added.length === 0 ? 'Засварласан файлаар солих' : 'Засварласан файл нэмэх'}
                  </button>
                </div>

                {error && <p className="text-xs font-medium text-rose-600">Энэ хэсэгт шинэ файл нэмэх эсвэл буруу файлыг устгана уу.</p>}
              </div>
            </section>
          );
        })}
      </div>

      <aside className="space-y-3 lg:sticky lg:top-20">
        <div className="border border-slate-200 bg-white p-5">
          <p className="text-sm font-semibold text-slate-900">Засварын явц</p>
          <p className="mt-1 text-sm text-slate-500">
            <span className="font-semibold text-slate-900">{doneCount}</span> / {items.length} хэсэг засагдсан
          </p>
          <div className="mt-3 h-1.5 bg-slate-100">
            <div className="h-full bg-teal-600 transition-all" style={{ width: `${(doneCount / items.length) * 100}%` }} />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={sending}
            className="mt-4 h-11 w-full bg-color-primary px-4 text-sm font-semibold text-white transition hover:bg-color-primary-dark disabled:opacity-60"
          >
            {sending ? 'Илгээж байна...' : 'Засаад илгээх'}
          </button>
          {showErrors && doneCount < items.length && (
            <p className="mt-2 text-xs text-rose-600">Бүх хэсгийг засаад илгээнэ үү.</p>
          )}
        </div>
        <Link
          href={`/report/${reportId}?role=sender`}
          className="flex h-10 items-center justify-center border border-slate-200 bg-white text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Буцах
        </Link>
        <Link href={`/sender/submit?edit=${reportId}`} className="block text-center text-xs text-slate-500 hover:text-teal-700 hover:underline">
          Бусад мэдээллийг засах бол бүтэн маягтаар засна уу
        </Link>
      </aside>
    </div>
  );
}
