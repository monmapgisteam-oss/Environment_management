'use client';

import { useState } from 'react';
import { HiPlus } from 'react-icons/hi';
import ConclusionEditForm from '@/components/registration/ConclusionEditForm';

const EMPTY = {
  conclusionYear: String(new Date().getFullYear()),
  conclusionNumber: '',
  conclusionType: '',
  projectName: '',
  projectCategory: '',
  district: '',
  implementerName: '',
};

// "Шинэ дүгнэлт нэмэх": opens an empty conclusion form above the list.
export default function NewConclusionButton({ implementerName }: { implementerName: string }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return (
      <ConclusionEditForm
        isNew
        endpoint="/api/sender/conclusions"
        file={null}
        initial={{ ...EMPTY, implementerName }}
        onCancel={() => setOpen(false)}
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="inline-flex h-10 items-center gap-2 bg-color-primary px-4 text-sm font-semibold text-white transition hover:bg-color-primary-dark"
    >
      <HiPlus size={16} />
      Шинэ дүгнэлт нэмэх
    </button>
  );
}
