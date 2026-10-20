import { REPORT_CATEGORIES } from '@/lib/constants';

type ReportInfoFields = {
  reportCategory: string;
  reportNumber: string;
  title: string;
  implementerName: string;
  implementerRegister: string;
  approvedDate: string;
  description: string;
};

interface ReportInfoCardProps {
  formData: ReportInfoFields;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const inputClass = 'w-full h-11 rounded-xl border border-[#D9E4F0] bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition';

export default function ReportInfoCard({ formData, handleChange }: ReportInfoCardProps) {
  return (
    <div className="border border-[#E8F0FE] rounded-2xl p-6">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-color-text-main">Тайлангийн мэдээлэл</h2>
      </div>

      {/* Row 1: Report Type & Number */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-color-text-main mb-1.5">
            Тайлангийн төрөл <span className="text-red-500">*</span>
          </label>
          <select
            name="reportCategory"
            value={formData.reportCategory}
            onChange={handleChange}
            required
            className={inputClass + ' appearance-none'}
          >
            <option value="">Сонгоно уу</option>
            {REPORT_CATEGORIES.map((category) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-color-text-main mb-1.5">
            Тайлангийн дугаар <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="reportNumber"
            value={formData.reportNumber}
            onChange={handleChange}
            placeholder="RPT-2025-001"
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 2: Project Name */}
      <div className="mb-5">
        <label className="block text-sm font-medium text-color-text-main mb-1.5">
          Төслийн нэр <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          name="title"
          value={formData.title}
          onChange={handleChange}
          placeholder="Төслийн нэр"
          required
          className={inputClass}
        />
      </div>

      {/* Row 3: Implementer name & register */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-color-text-main mb-1.5">
            Төсөл хэрэгжүүлэгчийн нэр <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="implementerName"
            value={formData.implementerName}
            onChange={handleChange}
            placeholder="Төсөл хэрэгжүүлэгч байгууллага"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-color-text-main mb-1.5">
            Төсөл хэрэгжүүлэгчийн РД <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="implementerRegister"
            value={formData.implementerRegister}
            onChange={handleChange}
            placeholder="РД-12345"
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 4: Approved date */}
      <div className="grid grid-cols-2 gap-5 mb-5">
        <div>
          <label className="block text-sm font-medium text-color-text-main mb-1.5">
            Тайлан батлагдсан огноо <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            name="approvedDate"
            value={formData.approvedDate}
            onChange={handleChange}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Row 5: Greenery information */}
      <div>
        <label className="block text-sm font-medium text-color-text-main mb-1.5">
          Ногоон байгууламжийн талаарх мэдээлэл
        </label>
        <textarea
          name="description"
          value={formData.description}
          onChange={handleChange}
          placeholder="Ногоон байгууламжийн талаарх мэдээллээ бичнэ үү"
          rows={5}
          className="w-full rounded-xl border border-[#D9E4F0] bg-white px-4 py-3 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y"
        />
      </div>
    </div>
  );
}
