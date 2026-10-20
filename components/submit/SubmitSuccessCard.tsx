import { HiCheckCircle } from "react-icons/hi";

type SubmitSuccessCardProps = {
  isEdit: boolean;
  isGeneralEvaluation: boolean;
  onBackToReports: () => void;
  onReset: () => void;
};

// Shown after a report is submitted; editing returns to the list, creating
// offers to start another submission.
export default function SubmitSuccessCard({
  isEdit,
  isGeneralEvaluation,
  onBackToReports,
  onReset,
}: SubmitSuccessCardProps) {
  return (
    <div
      className="bg-white rounded-3xl overflow-hidden p-16 text-center"
      style={{ boxShadow: "0 4px 30px rgba(15, 63, 158, 0.07)" }}
    >
      <div className="flex justify-center mb-5">
        <div className="w-20 h-20 rounded-full bg-emerald-50 flex items-center justify-center">
          <HiCheckCircle size={48} className="text-emerald-500" />
        </div>
      </div>
      <h2 className="text-2xl font-bold text-slate-900">
        {isGeneralEvaluation ? "Дүгнэлт амжилттай илгээгдлээ!" : "Тайлан амжилттай илгээгдлээ!"}
      </h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
        {isGeneralEvaluation
          ? "Таны ерөнхий үнэлгээний дүгнэлт амжилттай хүлээн авлаа."
          : "Хянах байгууллага таны тайланг хянаж үнэлгээ өгөх болно."}
      </p>
      <div className="flex items-center justify-center mt-8">
        {isEdit ? (
          <button
            type="button"
            onClick={onBackToReports}
            className="h-11 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center"
          >
            Миний тайлангууд руу буцах
          </button>
        ) : (
          <button
            type="button"
            onClick={onReset}
            className="h-11 px-6 rounded-xl bg-color-primary text-white text-sm font-semibold hover:bg-color-primary-dark transition inline-flex items-center"
          >
            {isGeneralEvaluation ? "Дахин дүгнэлт илгээх" : "Дахин тайлан илгээх"}
          </button>
        )}
      </div>
    </div>
  );
}
