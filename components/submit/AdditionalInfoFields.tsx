import type { ChangeEvent } from "react";

type AdditionalInfoFieldsProps = {
  title: string;
  description: string;
  onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
};

// Нэмэлт мэдээлэл — writing only, not a full report.
export default function AdditionalInfoFields({ title, description, onChange }: AdditionalInfoFieldsProps) {
  return (
    <div className="border border-slate-200 rounded-2xl p-6">
      <div className="mb-5">
        <label className="block text-sm font-medium text-color-text-main mb-1.5">
          Гарчиг <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={title}
          onChange={onChange}
          placeholder="Нэмэлт мэдээллийн гарчиг"
          required
          className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-color-text-main mb-1.5">
          Агуулга <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          value={description}
          onChange={onChange}
          placeholder="Нэмэлт мэдээллээ энд бичнэ үү..."
          rows={10}
          required
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y"
        />
      </div>
    </div>
  );
}
