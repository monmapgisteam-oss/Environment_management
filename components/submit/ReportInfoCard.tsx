import { REPORT_CATEGORIES } from '@/lib/constants';
import DateInput from '@/components/ui/DateInput';

type ReportInfoFields = {
  reportCategory: string;
  reportNumber: string;
  title: string;
  approvedDate: string;
  description: string;
};

interface ReportInfoCardProps {
  formData: ReportInfoFields;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
}

const inputClass = 'w-full h-11 border border-slate-200 bg-white px-4 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition';

const labelClass = 'block text-sm font-medium text-color-text-main mb-1.5';

function Required() {
  return <span className="text-red-500">*</span>;
}

export default function ReportInfoCard({ formData, handleChange }: ReportInfoCardProps) {
  return (
    <div className="border border-slate-200 bg-white p-6">
      {/* Header, with the number the server assigned once the report is saved */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-teal-50 flex items-center justify-center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-color-text-main">Тайлангийн мэдээлэл</h2>
        </div>
        {formData.reportNumber && (
          <span className="bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            Тайлангийн дугаар: <span className="font-semibold text-slate-800">{formData.reportNumber}</span>
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
        <div>
          <label htmlFor="report-reportCategory" className={labelClass}>
            Төслийн ангилал <Required />
          </label>
          <select
            id="report-reportCategory"
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
          <label htmlFor="report-approvedDate" className={labelClass}>
            Тайлан батлагдсан огноо <Required />
          </label>
          <DateInput
            id="report-approvedDate"
            name="approvedDate"
            value={formData.approvedDate}
            onChange={(value) =>
              handleChange({ target: { name: 'approvedDate', value } } as React.ChangeEvent<HTMLInputElement>)
            }
            required
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="report-title" className={labelClass}>
            Төслийн нэр <Required />
          </label>
          <input
            type="text"
            id="report-title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Төслийн нэр"
            required
            className={inputClass}
          />
        </div>

        <div className="md:col-span-2">
          <label htmlFor="report-description" className={labelClass}>Ногоон байгууламжийн талаарх мэдээлэл</label>
          <textarea
            id="report-description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Ногоон байгууламжийн талаарх мэдээллээ бичнэ үү"
            rows={4}
            className="w-full border border-slate-200 bg-white px-4 py-3 text-sm text-color-text-main placeholder:text-color-text-muted focus:outline-none focus:border-color-primary focus:ring-2 focus:ring-color-primary/10 transition resize-y"
          />
        </div>
      </div>
    </div>
  );
}
