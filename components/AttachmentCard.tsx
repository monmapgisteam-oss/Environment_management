import { useState } from 'react';

interface AttachmentCardProps {
  attachedFiles?: File[];
  onFileChange?: (files: File[]) => void;
}

export default function AttachmentCard({ attachedFiles = [], onFileChange }: AttachmentCardProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (onFileChange) onFileChange(files);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (onFileChange) onFileChange(files);
  };

  return (
    <div className="border border-[#E8F0FE] rounded-2xl p-6 h-fit">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-1">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
          </svg>
        </div>
        <h3 className="text-base font-semibold text-color-text-main">
          Хавсралт <span className="text-sm font-normal text-color-text-muted">(сонголттой)</span>
        </h3>
      </div>

      <p className="text-[13px] text-color-text-muted mt-2 mb-5">
        Тайлантай холбоотой баримт, файл хавсаргана уу.
      </p>

      {/* Upload Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition
          ${isDragging ? 'border-color-primary bg-blue-50' : 'border-[#D9E4F0] bg-[#F8FBFF] hover:border-color-primary'}`}
      >
        <input
          type="file"
          id="fileInput"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
          accept=".pdf,.doc,.docx"
        />
        <label htmlFor="fileInput" className="cursor-pointer block">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
          </div>
          <p className="text-sm text-color-text-main">
            <span className="font-semibold text-color-primary">Файл сонгох</span>{' '}
            <span className="text-color-text-muted">эсвэл чирж оруулна уу</span>
          </p>
          <p className="text-xs text-color-text-muted mt-1.5">PDF, DOC, DOCX</p>
          <p className="text-xs text-color-text-muted mt-0.5">Хамгийн их хэмжээ: 10MB</p>
        </label>
      </div>

      {/* Attached Files */}
      <div className="mt-5 border border-[#E8F0FE] rounded-xl p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-sm font-semibold text-color-text-main">Хавсаргасан файл ({attachedFiles.length})</span>
        </div>
        {attachedFiles.length === 0 ? (
          <p className="text-[13px] text-color-text-muted">Одоогоор файл хавсаргаагүй байна.</p>
        ) : (
          <div className="space-y-2 mt-2">
            {attachedFiles.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-2 rounded-lg bg-[#F8FBFF] border border-[#E8F0FE]">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-color-text-main truncate">{file.name}</p>
                  <p className="text-xs text-color-text-muted">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newFiles = attachedFiles.filter((_, i) => i !== index);
                    if (onFileChange) onFileChange(newFiles);
                  }}
                  className="text-color-text-muted hover:text-red-500 transition text-xs p-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
