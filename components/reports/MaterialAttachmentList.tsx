'use client';

import { useState } from 'react';
import { HiChevronDown } from 'react-icons/hi';
import AttachmentRow from '@/components/reports/AttachmentRow';
import type { Attachment } from '@/lib/reports/attachments';
import {
  groupMaterialAttachments,
  leftoverMaterialGroups,
  materialsFor,
  materialsTitle,
  type ReportMaterial,
} from '@/lib/reports/materials';

type Item = { index: number; material: ReportMaterial; files: Attachment[] };
type View = 'attached' | 'missing' | 'all';

// Documents the sender attached, in the regulation's order. A long regulation
// list would push the rest of the page far down, so the items are split into
// "attached" and "missing" tabs and laid out in two columns, and the whole
// section can be collapsed.
export default function MaterialAttachmentList({
  attachments,
  reportType,
  reportCategory,
}: {
  attachments: Attachment[];
  reportType: string | null;
  reportCategory: string | null;
}) {
  const groups = groupMaterialAttachments(attachments, reportType, reportCategory);
  const leftover = leftoverMaterialGroups(attachments, reportType, reportCategory);
  const filesById = new Map([...groups, ...leftover].map(({ material, files }) => [material.id, files]));
  const items: Item[] = [...materialsFor(reportType, reportCategory), ...leftover.map((group) => group.material)].map(
    (material, index) => ({ index: index + 1, material, files: filesById.get(material.id) ?? [] }),
  );
  const attached = items.filter((item) => item.files.length > 0);
  const missing = items.filter((item) => item.files.length === 0);

  const [open, setOpen] = useState(true);
  const [view, setView] = useState<View>(attached.length > 0 ? 'attached' : 'all');
  if (attached.length === 0 && leftover.length === 0) return null;

  const percent = items.length ? Math.round((attached.length / items.length) * 100) : 0;
  const tabs: { value: View; label: string; count: number }[] = [
    { value: 'attached', label: 'Хавсаргасан', count: attached.length },
    { value: 'missing', label: 'Хавсаргаагүй', count: missing.length },
    { value: 'all', label: 'Бүгд', count: items.length },
  ];

  return (
    <section className="border border-slate-200 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="min-w-0">
          <span className="block text-base font-semibold text-slate-900">{materialsTitle(reportType)}</span>
          <span className="mt-2 flex items-center gap-3">
            <span className="h-1.5 w-40 max-w-full bg-slate-100">
              <span className="block h-full bg-teal-600" style={{ width: `${percent}%` }} />
            </span>
            <span className="text-xs text-slate-500">
              <span className="font-semibold text-slate-800">{attached.length}</span> / {items.length} хавсаргасан
            </span>
          </span>
        </span>
        <HiChevronDown size={18} className={`shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="border-t border-slate-200">
          <div className="flex gap-1 border-b border-slate-200 bg-slate-50 px-5 py-2">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setView(tab.value)}
                className={`inline-flex h-8 items-center gap-1.5 px-3 text-sm font-medium transition ${
                  view === tab.value ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
                <span
                  className={`text-xs tabular-nums ${
                    tab.value === 'missing' && tab.count > 0 ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="p-4">
            {view === 'attached' && <AttachedGrid items={attached} />}
            {view === 'missing' && <MissingGrid items={missing} />}
            {view === 'all' && (
              <div className="space-y-5">
                {attached.length > 0 && <AttachedGrid items={attached} />}
                {missing.length > 0 && (
                  <div>
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">Хавсаргаагүй</p>
                    <MissingGrid items={missing} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ItemNumber({ value, done }: { value: number; done: boolean }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center text-[11px] font-semibold ${
        done ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-400'
      }`}
    >
      {value}
    </span>
  );
}

// Attached items as cards, two per row on wide screens: label, then files.
function AttachedGrid({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-slate-400">Хавсаргасан бичиг баримт алга.</p>;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {items.map(({ index, material, files }) => (
        <li key={material.id} className="flex min-w-0 flex-col border border-slate-200 bg-white">
          <div className="flex items-start gap-2.5 px-3.5 pb-2 pt-3">
            <ItemNumber value={index} done />
            <p className="line-clamp-2 min-w-0 flex-1 text-sm font-medium text-slate-900" title={material.label}>
              {material.label}
            </p>
            <span className="shrink-0 text-[11px] text-slate-400">{files.length} файл</span>
          </div>
          <ul className="mt-auto divide-y divide-slate-100 border-t border-slate-100 bg-slate-50/60 px-3.5">
            {files.map((file, fileIndex) => (
              <AttachmentRow key={`${file.url}-${fileIndex}`} file={file} compact />
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
}

// Missing items as short lines, two columns on wide screens.
function MissingGrid({ items }: { items: Item[] }) {
  if (items.length === 0) return <p className="py-6 text-center text-sm text-slate-400">Бүх бичиг баримт хавсаргасан.</p>;
  return (
    <ul className="grid gap-x-6 md:grid-cols-2">
      {items.map(({ index, material }) => (
        <li key={material.id} className="flex items-start gap-2.5 border-b border-slate-100 py-2">
          <ItemNumber value={index} done={false} />
          <div className="min-w-0">
            <p className="line-clamp-2 text-sm text-slate-600" title={material.label}>
              {material.label}
            </p>
            {material.note && <p className="mt-0.5 line-clamp-1 text-xs text-slate-400">{material.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}
