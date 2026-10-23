'use client';

import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { HiChevronDown, HiOutlineDocumentText } from 'react-icons/hi';
import type { SignedReportSection } from '@/lib/reports/reportSections';
import type { RevisionItem } from '@/lib/reports/revisions';

type Props = {
  title: string;
  description: string;
  sections: SignedReportSection[];
  // Sections already flagged (e.g. the staff member's request), pre-ticked.
  initialItems?: RevisionItem[];
  initialReason?: string;
  submitLabel: string;
  // Tone of the submit button: staff ask the manager, the manager returns.
  tone?: 'orange' | 'purple';
  onSubmit: (reason: string, items: { key: string; comment: string }[]) => Promise<boolean>;
  onClose: () => void;
};

// Picks the upload sections the sender must fix, each with its own comment,
// plus an optional general note. The sender later fixes only these sections.
export default function ReturnDialog({
  title,
  description,
  sections,
  initialItems = [],
  initialReason = '',
  submitLabel,
  tone = 'orange',
  onSubmit,
  onClose,
}: Props) {
  // key -> comment; a key present here is flagged.
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(initialItems.map((item) => [item.key, item.comment])),
  );
  const [reason, setReason] = useState(initialReason);
  const [open, setOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const groups = useMemo(() => {
    const map = new Map<string, SignedReportSection[]>();
    for (const section of sections) map.set(section.group, [...(map.get(section.group) ?? []), section]);
    return [...map.entries()];
  }, [sections]);

  const flagged = Object.keys(comments);
  const missingComment = flagged.filter((key) => !comments[key].trim());
  const canSubmit = (flagged.length > 0 || reason.trim().length > 0) && missingComment.length === 0;

  const toggle = (key: string) =>
    setComments((current) => {
      if (key in current) {
        const { [key]: _removed, ...rest } = current;
        return rest;
      }
      return { ...current, [key]: '' };
    });

  const submit = async () => {
    if (!canSubmit) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    const ok = await onSubmit(
      reason.trim(),
      flagged.map((key) => ({ key, comment: comments[key].trim() })),
    );
    setSaving(false);
    if (ok) onClose();
  };

  const submitClass =
    tone === 'purple' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-orange-600 hover:bg-orange-700';

  return createPortal(
    <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/40 p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="return-dialog-title"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-slate-200 px-6 py-5">
          <h3 id="return-dialog-title" className="text-lg font-semibold text-slate-900">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {groups.map(([group, groupSections]) => (
            <section key={group}>
              <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">{group}</h4>
              <ul className="divide-y divide-slate-100 border border-slate-200">
                {groupSections.map((section) => {
                  const checked = section.key in comments;
                  const expanded = open === section.key;
                  const error = showErrors && checked && !comments[section.key].trim();
                  return (
                    <li key={section.key} className={checked ? 'bg-orange-50/60' : ''}>
                      <div className="flex items-start gap-3 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(section.key)}
                          aria-label={section.label}
                          className="mt-0.5 h-4 w-4 shrink-0 accent-orange-600"
                        />
                        <button
                          type="button"
                          onClick={() => toggle(section.key)}
                          className="min-w-0 flex-1 text-left text-sm font-medium leading-snug text-slate-800"
                        >
                          {section.label}
                        </button>
                        <button
                          type="button"
                          onClick={() => setOpen(expanded ? null : section.key)}
                          disabled={section.files.length === 0}
                          className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-slate-500 hover:text-teal-700 disabled:cursor-default disabled:hover:text-slate-500"
                        >
                          {section.files.length ? `${section.files.length} файл` : 'Файлгүй'}
                          {section.files.length > 0 && (
                            <HiChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      </div>
                      {expanded && (
                        <ul className="mx-4 mb-3 space-y-1 border-l-2 border-slate-200 pl-3">
                          {section.files.map((file) => (
                            <li key={file.url}>
                              <a
                                href={file.viewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex max-w-full items-center gap-1.5 text-xs text-slate-600 hover:text-teal-700"
                              >
                                <HiOutlineDocumentText size={14} className="shrink-0" />
                                <span className="truncate">{file.name}</span>
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                      {checked && (
                        <div className="px-4 pb-3 pl-11">
                          <textarea
                            value={comments[section.key]}
                            onChange={(event) => setComments((current) => ({ ...current, [section.key]: event.target.value }))}
                            placeholder="Юу буруу байгаа, юуг засахыг бичнэ үү..."
                            rows={2}
                            autoFocus={!initialItems.some((item) => item.key === section.key)}
                            className={`w-full resize-y border bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 ${
                              error ? 'border-rose-400 focus:ring-rose-100' : 'border-slate-200 focus:border-orange-400 focus:ring-orange-100'
                            }`}
                          />
                          {error && <p className="mt-1 text-xs text-rose-600">Энэ хэсгийн тайлбарыг бичнэ үү.</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <section>
            <label htmlFor="return-dialog-reason" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Ерөнхий тайлбар (сонголттой)
            </label>
            <textarea
              id="return-dialog-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Тодорхой хэсэгт хамаарахгүй тайлбар..."
              rows={2}
              className="w-full resize-y border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-100"
            />
          </section>
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">
            {flagged.length ? `${flagged.length} хэсэг засуулахаар сонгосон` : 'Засуулах хэсгээ сонгоно уу'}
            {showErrors && flagged.length === 0 && !reason.trim() && (
              <span className="ml-1 text-rose-600">— хэсэг сонгох эсвэл тайлбар бичнэ үү.</span>
            )}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Цуцлах
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className={`px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50 ${submitClass}`}
            >
              {saving ? 'Илгээж байна...' : submitLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
